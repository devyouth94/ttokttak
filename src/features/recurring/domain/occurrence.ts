import {
  addDays,
  addYears,
  differenceInCalendarDays,
  isAfter,
  isBefore,
  isEqual,
  startOfWeek,
} from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import type {
  CompletionLog,
  DerivedOccurrence,
  OccurrenceStatus,
  RecurringItem,
} from "~/features/recurring/domain/types";
import { completionBasedRecurrenceTypes } from "~/features/recurring/domain/types";

const MAX_OCCURRENCES_PER_QUERY = 1000;
const CALENDAR_HOUR = 12;

/**
 * YYYY-MM-DD 문자열을 UTC 기준 Date로 변환한다.
 * 정오를 고정 시각으로 사용해 DST 경계에서 날짜가 밀리는 문제를 줄인다.
 */
function parseLocalDate(localDate: string): Date {
  const [year, month, day] = localDate.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, CALENDAR_HOUR));
}

/**
 * 계산된 local occurrence를 화면/도메인 공용 형태로 변환한다.
 */
function toOccurrence(
  item: RecurringItem,
  localDate: string,
  timezone: string,
  logsByScheduledAtUtc: Map<string, CompletionLog>,
  nowUtc: Date
): DerivedOccurrence {
  const scheduledAtUtcDate = fromZonedTime(
    `${localDate}T${item.reminderTimeLocal}:00`,
    timezone
  );
  const scheduledAtUtc = scheduledAtUtcDate.toISOString();

  return {
    itemId: item.id,
    scheduledAtUtc,
    scheduledAtLocal: formatInTimeZone(
      scheduledAtUtcDate,
      timezone,
      "yyyy-MM-dd'T'HH:mm:ss"
    ),
    localDate,
    localTime: item.reminderTimeLocal,
    status: resolveOccurrenceStatus(
      scheduledAtUtc,
      logsByScheduledAtUtc,
      nowUtc.toISOString()
    ),
  };
}

function toUtcTime(value: string): number {
  return new Date(value).getTime();
}

/**
 * 두 local date 문자열을 사전식으로 비교한다.
 */
function compareLocalDate(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * 월 단위 반복에서 존재하지 않는 일을 월말로 보정해 다음 날짜를 계산한다.
 */
function getLastDayOfUtcMonth(year: number, monthIndex: number): number {
  return new Date(
    Date.UTC(year, monthIndex + 1, 0, CALENDAR_HOUR)
  ).getUTCDate();
}

/**
 * 월 단위 반복에서 존재하지 않는 일을 월말로 보정해 다음 날짜를 계산한다.
 */
function addMonthsWithDayCorrection(
  currentLocalDate: string,
  referenceLocalDate: string,
  months: number
): string {
  const currentDate = parseLocalDate(currentLocalDate);
  const referenceDate = parseLocalDate(referenceLocalDate);
  const targetBaseDate = new Date(
    Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth() + months,
      1,
      CALENDAR_HOUR
    )
  );
  const targetMonthLastDay = getLastDayOfUtcMonth(
    targetBaseDate.getUTCFullYear(),
    targetBaseDate.getUTCMonth()
  );
  const dayOfMonth = Math.min(referenceDate.getUTCDate(), targetMonthLastDay);

  targetBaseDate.setUTCDate(dayOfMonth);

  return formatInTimeZone(targetBaseDate, "UTC", "yyyy-MM-dd");
}

/**
 * 연 단위 반복에서 존재하지 않는 일을 월말로 보정해 다음 날짜를 계산한다.
 */
function addYearsWithDayCorrection(
  currentLocalDate: string,
  referenceLocalDate: string,
  years: number
): string {
  const currentDate = parseLocalDate(currentLocalDate);
  const referenceDate = parseLocalDate(referenceLocalDate);
  const targetBaseDate = new Date(
    Date.UTC(
      currentDate.getUTCFullYear() + years,
      referenceDate.getUTCMonth(),
      1,
      CALENDAR_HOUR
    )
  );
  const targetMonthLastDay = getLastDayOfUtcMonth(
    targetBaseDate.getUTCFullYear(),
    targetBaseDate.getUTCMonth()
  );
  const dayOfMonth = Math.min(referenceDate.getUTCDate(), targetMonthLastDay);

  targetBaseDate.setUTCDate(dayOfMonth);

  return formatInTimeZone(targetBaseDate, "UTC", "yyyy-MM-dd");
}

/**
 * completion_based 계산에 사용할 마지막 completed 로그를 찾는다.
 */
function findLastCompletedLog(
  itemId: string,
  logs: CompletionLog[]
): CompletionLog | null {
  const completedLogs = logs
    .filter((log) => log.itemId === itemId && log.action === "completed")
    .sort((left, right) => right.actedAtUtc.localeCompare(left.actedAtUtc));

  return completedLogs[0] ?? null;
}

/**
 * item의 다음 occurrence 계산 기준이 되는 anchor local date를 구한다.
 */
function getAnchorLocalDate(
  item: RecurringItem,
  timezone: string,
  logs: CompletionLog[]
): string {
  if (item.anchorType !== "completion_based") {
    return item.startDateLocal;
  }

  if (item.recurrenceType === "once") {
    return item.startDateLocal;
  }

  const lastCompletedLog = findLastCompletedLog(item.id, logs);

  if (!lastCompletedLog) {
    return item.startDateLocal;
  }

  return formatInTimeZone(lastCompletedLog.actedAtUtc, timezone, "yyyy-MM-dd");
}

/**
 * 반복 규칙 하나를 기준으로 다음 local date를 계산한다.
 */
function getNextLocalDate(
  item: RecurringItem,
  localDate: string,
  referenceLocalDate: string = localDate
): string {
  switch (item.recurrenceType) {
    case "daily":
      return formatInTimeZone(
        addDays(parseLocalDate(localDate), 1),
        "UTC",
        "yyyy-MM-dd"
      );
    case "interval_days":
      return formatInTimeZone(
        addDays(parseLocalDate(localDate), item.intervalValue ?? 1),
        "UTC",
        "yyyy-MM-dd"
      );
    case "monthly":
      return addMonthsWithDayCorrection(localDate, referenceLocalDate, 1);
    case "interval_months":
      return addMonthsWithDayCorrection(
        localDate,
        referenceLocalDate,
        item.intervalValue ?? 1
      );
    case "yearly":
      return addYearsWithDayCorrection(localDate, referenceLocalDate, 1);
    default:
      return localDate;
  }
}

/**
 * recurrence type이 completion_based를 지원하는지 확인한다.
 */
function supportsCompletionBasedRecurrence(item: RecurringItem): boolean {
  return completionBasedRecurrenceTypes.includes(
    item.recurrenceType as (typeof completionBasedRecurrenceTypes)[number]
  );
}

/**
 * UTC 범위를 사용자 시간대 기준 local date 범위로 바꾼다.
 */
function getRangeLocalDates(
  rangeStartUtc: string,
  rangeEndUtc: string,
  timezone: string
): { endLocalDate: string; startLocalDate: string } {
  const rangeStartLocalDate = formatInTimeZone(
    rangeStartUtc,
    timezone,
    "yyyy-MM-dd"
  );
  const rangeEndLocalDate = formatInTimeZone(
    rangeEndUtc,
    timezone,
    "yyyy-MM-dd"
  );

  return {
    endLocalDate: rangeEndLocalDate,
    startLocalDate: rangeStartLocalDate,
  };
}

/**
 * 단순 반복 규칙에서 local date 시퀀스를 순차 생성한다.
 */
function* iterateSimpleRecurrenceDates(
  startLocalDate: string,
  endLocalDate: string,
  initialLocalDate: string,
  nextDate: (localDate: string) => string
): Generator<string> {
  let currentLocalDate = initialLocalDate;
  let occurrenceCount = 0;

  while (compareLocalDate(currentLocalDate, endLocalDate) <= 0) {
    if (compareLocalDate(currentLocalDate, startLocalDate) >= 0) {
      yield currentLocalDate;
    }

    currentLocalDate = nextDate(currentLocalDate);
    occurrenceCount += 1;

    assertOccurrenceLimit(occurrenceCount);
  }
}

/**
 * completion_based 규칙에서 completed 로그를 반영하며 local occurrence를 순차 계산한다.
 */
function getCompletionBasedLocalDates(
  item: RecurringItem,
  startLocalDate: string,
  endLocalDate: string,
  timezone: string,
  logsByScheduledAtUtc: Map<string, CompletionLog>
): string[] {
  const occurrences: string[] = [];

  let currentLocalDate = item.startDateLocal;
  let currentAnchorLocalDate = item.startDateLocal;
  let occurrenceCount = 0;

  while (compareLocalDate(currentLocalDate, endLocalDate) <= 0) {
    if (compareLocalDate(currentLocalDate, startLocalDate) >= 0) {
      occurrences.push(currentLocalDate);
    }

    const scheduledAtUtc = fromZonedTime(
      `${currentLocalDate}T${item.reminderTimeLocal}:00`,
      timezone
    ).toISOString();
    const matchedLog = logsByScheduledAtUtc.get(scheduledAtUtc);

    if (matchedLog?.action === "completed") {
      const completedLocalDate = formatInTimeZone(
        matchedLog.actedAtUtc,
        timezone,
        "yyyy-MM-dd"
      );

      currentAnchorLocalDate = completedLocalDate;
      currentLocalDate = getNextLocalDate(
        item,
        completedLocalDate,
        currentAnchorLocalDate
      );
    } else {
      currentLocalDate = getNextLocalDate(
        item,
        currentLocalDate,
        currentAnchorLocalDate
      );
    }

    occurrenceCount += 1;
    assertOccurrenceLimit(occurrenceCount);

    if (item.recurrenceType === "once") {
      break;
    }
  }

  return occurrences;
}

/**
 * weekly / interval_weeks 규칙의 local occurrence 목록을 계산한다.
 */
function getWeeklyLocalDates(
  item: RecurringItem,
  startLocalDate: string,
  endLocalDate: string
): string[] {
  const itemStartDate = parseLocalDate(item.startDateLocal);
  const rangeStartDate = parseLocalDate(startLocalDate);
  const rangeEndDate = parseLocalDate(endLocalDate);
  const itemWeekStart = startOfWeek(itemStartDate, { weekStartsOn: 0 });
  const occurrences: string[] = [];

  let cursor = rangeStartDate;
  let occurrenceCount = 0;

  while (isOnOrBefore(cursor, rangeEndDate)) {
    const cursorLocalDate = formatInTimeZone(cursor, "UTC", "yyyy-MM-dd");
    const cursorWeekStart = startOfWeek(cursor, { weekStartsOn: 0 });
    const weeksFromAnchor =
      differenceInCalendarDays(cursorWeekStart, itemWeekStart) / 7;
    const cursorWeekday = cursor.getUTCDay();
    const matchesWeekday = item.weekdayMask?.includes(cursorWeekday) ?? false;
    const matchesInterval =
      item.recurrenceType === "weekly" ||
      weeksFromAnchor % (item.intervalValue ?? 1) === 0;

    if (
      compareLocalDate(cursorLocalDate, item.startDateLocal) >= 0 &&
      matchesWeekday &&
      matchesInterval
    ) {
      occurrences.push(cursorLocalDate);
    }

    cursor = addDays(cursor, 1);
    occurrenceCount += 1;
    assertOccurrenceLimit(occurrenceCount);
  }

  return occurrences;
}

/**
 * recurrence 규칙에 따라 범위 내 local occurrence 날짜 목록을 계산한다.
 */
function getOccurrenceLocalDates(
  item: RecurringItem,
  rangeStartUtc: string,
  rangeEndUtc: string,
  timezone: string,
  logs: CompletionLog[]
): string[] {
  const logsByScheduledAtUtc = new Map(
    logs
      .filter((log) => log.itemId === item.id)
      .map((log) => [log.scheduledAtUtc, log] as const)
  );
  const { endLocalDate, startLocalDate } = getRangeLocalDates(
    rangeStartUtc,
    rangeEndUtc,
    timezone
  );
  const anchorLocalDate = getAnchorLocalDate(item, timezone, logs);
  const isCompletionBased =
    item.anchorType === "completion_based" &&
    supportsCompletionBasedRecurrence(item);

  if (isCompletionBased) {
    return getCompletionBasedLocalDates(
      item,
      startLocalDate,
      endLocalDate,
      timezone,
      logsByScheduledAtUtc
    );
  }

  switch (item.recurrenceType) {
    case "once": {
      const isInRange =
        compareLocalDate(anchorLocalDate, startLocalDate) >= 0 &&
        compareLocalDate(anchorLocalDate, endLocalDate) <= 0;

      return isInRange ? [anchorLocalDate] : [];
    }
    case "daily":
      return Array.from(
        iterateSimpleRecurrenceDates(
          startLocalDate,
          endLocalDate,
          anchorLocalDate,
          (localDate) => getNextLocalDate(item, localDate, anchorLocalDate)
        )
      );
    case "interval_days":
      return Array.from(
        iterateSimpleRecurrenceDates(
          startLocalDate,
          endLocalDate,
          anchorLocalDate,
          (localDate) => getNextLocalDate(item, localDate, anchorLocalDate)
        )
      );
    case "weekly":
    case "interval_weeks":
      return getWeeklyLocalDates(item, startLocalDate, endLocalDate);
    case "monthly":
      return Array.from(
        iterateSimpleRecurrenceDates(
          startLocalDate,
          endLocalDate,
          anchorLocalDate,
          (localDate) => getNextLocalDate(item, localDate, anchorLocalDate)
        )
      );
    case "interval_months":
      return Array.from(
        iterateSimpleRecurrenceDates(
          startLocalDate,
          endLocalDate,
          anchorLocalDate,
          (localDate) => getNextLocalDate(item, localDate, anchorLocalDate)
        )
      );
    case "yearly":
      return Array.from(
        iterateSimpleRecurrenceDates(
          startLocalDate,
          endLocalDate,
          anchorLocalDate,
          (localDate) => getNextLocalDate(item, localDate, anchorLocalDate)
        )
      );
    default:
      return [];
  }
}

/**
 * Date가 다른 Date보다 같거나 이전인지 확인한다.
 */
function isOnOrBefore(target: Date, compare: Date): boolean {
  return isBefore(target, compare) || isEqual(target, compare);
}

/**
 * occurrence 개수가 안전 상한을 넘지 않았는지 확인한다.
 */
function assertOccurrenceLimit(occurrenceCount: number): void {
  if (occurrenceCount > MAX_OCCURRENCES_PER_QUERY) {
    throw new Error("occurrence 계산 상한을 초과했습니다.");
  }
}

/**
 * UTC 시각이 조회 범위 안에 포함되는지 확인한다.
 */
function isUtcWithinRange(
  scheduledAtUtc: string,
  rangeStartUtc: string,
  rangeEndUtc: string
): boolean {
  const scheduledAtUtcDate = new Date(scheduledAtUtc);
  const rangeStartDate = new Date(rangeStartUtc);
  const rangeEndDate = new Date(rangeEndUtc);

  return (
    isOnOrAfter(scheduledAtUtcDate, rangeStartDate) &&
    isOnOrBefore(scheduledAtUtcDate, rangeEndDate)
  );
}

/**
 * Date가 다른 Date보다 같거나 이후인지 확인한다.
 */
function isOnOrAfter(target: Date, compare: Date): boolean {
  return isAfter(target, compare) || isEqual(target, compare);
}

/**
 * occurrence identity에 대응하는 상태를 계산한다.
 */
export function resolveOccurrenceStatus(
  scheduledAtUtc: string,
  logsByScheduledAtUtc: Map<string, CompletionLog>,
  nowUtc: string
): OccurrenceStatus {
  const matchedLog = logsByScheduledAtUtc.get(scheduledAtUtc);

  if (matchedLog?.action === "completed") {
    return "completed";
  }

  if (matchedLog?.action === "skipped") {
    return "skipped";
  }

  if (toUtcTime(scheduledAtUtc) < toUtcTime(nowUtc)) {
    return "overdue";
  }

  return "scheduled";
}

/**
 * 특정 item의 마지막 completed 로그를 조회한다.
 */
export function getLastCompletedLog(
  itemId: string,
  logs: CompletionLog[]
): CompletionLog | null {
  return findLastCompletedLog(itemId, logs);
}

/**
 * UTC 범위 안에 포함되는 derived occurrence 목록을 계산한다.
 */
export function getOccurrencesInRange(
  item: RecurringItem,
  rangeStartUtc: string,
  rangeEndUtc: string,
  timezone: string,
  completionLogs: CompletionLog[],
  nowUtc: string = new Date().toISOString()
): DerivedOccurrence[] {
  const logsByScheduledAtUtc = new Map(
    completionLogs
      .filter((log) => log.itemId === item.id)
      .map((log) => [log.scheduledAtUtc, log] as const)
  );
  const occurrenceLocalDates = getOccurrenceLocalDates(
    item,
    rangeStartUtc,
    rangeEndUtc,
    timezone,
    completionLogs
  );
  const nowUtcDate = new Date(nowUtc);

  return occurrenceLocalDates
    .map((localDate) =>
      toOccurrence(item, localDate, timezone, logsByScheduledAtUtc, nowUtcDate)
    )
    .filter((occurrence) =>
      isUtcWithinRange(occurrence.scheduledAtUtc, rangeStartUtc, rangeEndUtc)
    );
}

/**
 * 현재 시각 이후 가장 가까운 occurrence 하나를 계산한다.
 */
export function getNextOccurrence(
  item: RecurringItem,
  nowUtc: string,
  timezone: string,
  completionLogs: CompletionLog[]
): DerivedOccurrence | null {
  const nowDate = new Date(nowUtc);
  const rangeEndUtc = addYears(nowDate, 2).toISOString();
  const upcomingOccurrences = getOccurrencesInRange(
    item,
    nowUtc,
    rangeEndUtc,
    timezone,
    completionLogs,
    nowUtc
  ).filter((occurrence) => occurrence.scheduledAtUtc >= nowUtc);

  return upcomingOccurrences[0] ?? null;
}

/**
 * item과 occurrence 시각을 결합해 stable identity 문자열을 만든다.
 */
export function getOccurrenceIdentity(
  itemId: string,
  scheduledAtUtc: string
): string {
  return `${itemId}:${scheduledAtUtc}`;
}
