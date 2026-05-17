import {
  addDays,
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
  RecurringItemScheduleVersion,
} from "~/features/recurring/domain/types";
import { completionBasedRecurrenceTypes } from "~/features/recurring/domain/types";

const MAX_OCCURRENCES_PER_QUERY = 1000;
const CALENDAR_HOUR = 12;

type ScheduleContext = {
  anchorType: RecurringItemScheduleVersion["anchorType"];
  effectiveFromUtc: string;
  endDateLocal: RecurringItemScheduleVersion["endDateLocal"];
  itemId: string;
  intervalValue: RecurringItemScheduleVersion["intervalValue"];
  recurrenceType: RecurringItemScheduleVersion["recurrenceType"];
  reminderTimeLocal: string;
  seedStartDateLocal: string;
  weekdayMask: RecurringItemScheduleVersion["weekdayMask"];
};

function parseLocalDate(localDate: string): Date {
  const [year, month, day] = localDate.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, CALENDAR_HOUR));
}

function compareLocalDate(a: string, b: string): number {
  return a.localeCompare(b);
}

function getLastDayOfUtcMonth(year: number, monthIndex: number): number {
  return new Date(
    Date.UTC(year, monthIndex + 1, 0, CALENDAR_HOUR)
  ).getUTCDate();
}

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

function findLastCompletedLog(
  itemId: string,
  logs: CompletionLog[],
  actedBeforeUtc?: string
): CompletionLog | null {
  const completedLogs = logs
    .filter((log) => {
      if (log.itemId !== itemId || log.action !== "completed") {
        return false;
      }

      if (!actedBeforeUtc) {
        return true;
      }

      return log.actedAtUtc < actedBeforeUtc;
    })
    .sort((left, right) => right.actedAtUtc.localeCompare(left.actedAtUtc));

  return completedLogs[0] ?? null;
}

function supportsCompletionBasedRecurrence(
  recurrenceType: ScheduleContext["recurrenceType"]
): boolean {
  return completionBasedRecurrenceTypes.includes(
    recurrenceType as (typeof completionBasedRecurrenceTypes)[number]
  );
}

function getScheduledAtUtc(
  localDate: string,
  reminderTimeLocal: string,
  timezone: string
): string {
  return fromZonedTime(
    `${localDate}T${reminderTimeLocal}:00`,
    timezone
  ).toISOString();
}

function toOccurrence(
  itemId: string,
  reminderTimeLocal: string,
  localDate: string,
  timezone: string,
  logsByScheduledAtUtc: Map<string, CompletionLog>,
  nowUtc: string
): DerivedOccurrence {
  const scheduledAtUtc = getScheduledAtUtc(
    localDate,
    reminderTimeLocal,
    timezone
  );
  const scheduledAtUtcDate = new Date(scheduledAtUtc);

  return {
    itemId,
    scheduledAtUtc,
    scheduledAtLocal: formatInTimeZone(
      scheduledAtUtcDate,
      timezone,
      "yyyy-MM-dd'T'HH:mm:ss"
    ),
    localDate,
    localTime: reminderTimeLocal,
    status: resolveOccurrenceStatus(
      scheduledAtUtc,
      logsByScheduledAtUtc,
      nowUtc,
      timezone
    ),
  };
}

function toScheduleContext(
  item: RecurringItem,
  version: RecurringItemScheduleVersion
): ScheduleContext {
  return {
    anchorType: version.anchorType,
    effectiveFromUtc: version.effectiveFromUtc,
    endDateLocal: version.endDateLocal ?? null,
    itemId: item.id,
    intervalValue: version.intervalValue,
    recurrenceType: version.recurrenceType,
    reminderTimeLocal: version.reminderTimeLocal,
    seedStartDateLocal: version.seedStartDateLocal,
    weekdayMask: version.weekdayMask,
  };
}

function getScheduleVersions(
  item: RecurringItem
): RecurringItemScheduleVersion[] {
  if (item.scheduleVersions?.length) {
    return item.scheduleVersions
      .slice()
      .sort((left, right) =>
        left.effectiveFromUtc.localeCompare(right.effectiveFromUtc)
      );
  }

  return [
    {
      id: `${item.id}:initial`,
      itemId: item.id,
      userId: item.userId,
      effectiveFromUtc: fromZonedTime(
        `${item.startDateLocal}T00:00:00.000`,
        item.timezone
      ).toISOString(),
      endDateLocal: item.endDateLocal ?? null,
      recurrenceType: item.recurrenceType,
      intervalValue: item.intervalValue,
      weekdayMask: item.weekdayMask,
      reminderTimeLocal: item.reminderTimeLocal,
      anchorType: item.anchorType,
      seedStartDateLocal: item.startDateLocal,
      notificationsEnabled: item.notificationsEnabled,
      createdAt: item.createdAt,
    },
  ];
}

function getVersionEndUtc(
  versions: RecurringItemScheduleVersion[],
  index: number
): string | null {
  return versions[index + 1]?.effectiveFromUtc ?? null;
}

function getNextLocalDate(
  schedule: ScheduleContext,
  localDate: string,
  referenceLocalDate: string = localDate
): string {
  switch (schedule.recurrenceType) {
    case "daily":
      return formatInTimeZone(
        addDays(parseLocalDate(localDate), 1),
        "UTC",
        "yyyy-MM-dd"
      );
    case "interval_days":
      return formatInTimeZone(
        addDays(parseLocalDate(localDate), schedule.intervalValue ?? 1),
        "UTC",
        "yyyy-MM-dd"
      );
    case "monthly":
      return addMonthsWithDayCorrection(localDate, referenceLocalDate, 1);
    case "interval_months":
      return addMonthsWithDayCorrection(
        localDate,
        referenceLocalDate,
        schedule.intervalValue ?? 1
      );
    default:
      return localDate;
  }
}

function getMaxLocalDate(left: string, right: string): string {
  return compareLocalDate(left, right) >= 0 ? left : right;
}

function isPastScheduleEndDate(schedule: ScheduleContext, localDate: string) {
  return (
    schedule.endDateLocal != null &&
    compareLocalDate(localDate, schedule.endDateLocal) > 0
  );
}

function getNextWeeklyCandidateLocalDate(
  schedule: ScheduleContext,
  startLocalDate: string
): string | null {
  const itemStartDate = parseLocalDate(schedule.seedStartDateLocal);
  const itemWeekStart = startOfWeek(itemStartDate, { weekStartsOn: 0 });
  let cursor = parseLocalDate(
    getMaxLocalDate(startLocalDate, schedule.seedStartDateLocal)
  );
  let occurrenceCount = 0;

  while (occurrenceCount <= MAX_OCCURRENCES_PER_QUERY) {
    const cursorLocalDate = formatInTimeZone(cursor, "UTC", "yyyy-MM-dd");
    const cursorWeekStart = startOfWeek(cursor, { weekStartsOn: 0 });
    const weeksFromAnchor =
      differenceInCalendarDays(cursorWeekStart, itemWeekStart) / 7;
    const cursorWeekday = cursor.getUTCDay();
    const matchesWeekday =
      schedule.weekdayMask?.includes(cursorWeekday) ?? false;
    const matchesInterval =
      schedule.recurrenceType === "weekly" ||
      weeksFromAnchor % (schedule.intervalValue ?? 1) === 0;

    if (
      compareLocalDate(cursorLocalDate, schedule.seedStartDateLocal) >= 0 &&
      matchesWeekday &&
      matchesInterval
    ) {
      return cursorLocalDate;
    }

    cursor = addDays(cursor, 1);
    occurrenceCount += 1;
  }

  return null;
}

function getNextFixedLocalDate(
  schedule: ScheduleContext,
  localDate: string
): string | null {
  switch (schedule.recurrenceType) {
    case "once":
      return null;
    case "weekly":
    case "interval_weeks":
      return getNextWeeklyCandidateLocalDate(
        schedule,
        formatInTimeZone(
          addDays(parseLocalDate(localDate), 1),
          "UTC",
          "yyyy-MM-dd"
        )
      );
    default:
      return getNextLocalDate(schedule, localDate, schedule.seedStartDateLocal);
  }
}

function getInitialOccurrenceLocalDate(
  schedule: ScheduleContext
): string | null {
  switch (schedule.recurrenceType) {
    case "weekly":
    case "interval_weeks":
      return getNextWeeklyCandidateLocalDate(
        schedule,
        schedule.seedStartDateLocal
      );
    default:
      return schedule.seedStartDateLocal;
  }
}

function getInitialCompletionAnchorLocalDate(
  itemId: string,
  effectiveFromUtc: string,
  fallbackLocalDate: string,
  timezone: string,
  logs: CompletionLog[]
): string {
  const lastCompletedLog = findLastCompletedLog(itemId, logs, effectiveFromUtc);

  if (!lastCompletedLog) {
    return fallbackLocalDate;
  }

  return formatInTimeZone(lastCompletedLog.actedAtUtc, timezone, "yyyy-MM-dd");
}

function isOnOrBefore(target: Date, compare: Date): boolean {
  return isBefore(target, compare) || isEqual(target, compare);
}

function isOnOrAfter(target: Date, compare: Date): boolean {
  return isAfter(target, compare) || isEqual(target, compare);
}

function assertOccurrenceLimit(occurrenceCount: number): void {
  if (occurrenceCount > MAX_OCCURRENCES_PER_QUERY) {
    throw new Error("occurrence 계산 상한을 초과했습니다.");
  }
}

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

function buildLogsByScheduledAtUtc(
  itemId: string,
  completionLogs: CompletionLog[]
): Map<string, CompletionLog> {
  return new Map(
    completionLogs
      .filter((log) => log.itemId === itemId)
      .map((log) => [log.scheduledAtUtc, log] as const)
  );
}

function collectOccurrencesForVersion(params: {
  completionLogs: CompletionLog[];
  logsByScheduledAtUtc: Map<string, CompletionLog>;
  nowUtc: string;
  rangeEndUtc: string;
  rangeStartUtc: string;
  schedule: ScheduleContext;
  timezone: string;
  versionEndUtc: string | null;
}): DerivedOccurrence[] {
  const {
    completionLogs,
    logsByScheduledAtUtc,
    nowUtc,
    rangeEndUtc,
    rangeStartUtc,
    schedule,
    timezone,
    versionEndUtc,
  } = params;
  const occurrences: DerivedOccurrence[] = [];
  const isCompletionBased =
    schedule.anchorType === "completion_based" &&
    supportsCompletionBasedRecurrence(schedule.recurrenceType);
  const initialAnchorLocalDate = isCompletionBased
    ? getInitialCompletionAnchorLocalDate(
        schedule.itemId,
        schedule.effectiveFromUtc,
        schedule.seedStartDateLocal,
        timezone,
        completionLogs
      )
    : schedule.seedStartDateLocal;
  let currentLocalDate = getInitialOccurrenceLocalDate(schedule);
  let currentAnchorLocalDate = initialAnchorLocalDate;
  let occurrenceCount = 0;

  while (currentLocalDate) {
    if (isPastScheduleEndDate(schedule, currentLocalDate)) {
      break;
    }

    const scheduledAtUtc = getScheduledAtUtc(
      currentLocalDate,
      schedule.reminderTimeLocal,
      timezone
    );

    if (versionEndUtc && scheduledAtUtc >= versionEndUtc) {
      break;
    }

    if (scheduledAtUtc > rangeEndUtc) {
      break;
    }

    if (
      scheduledAtUtc >= rangeStartUtc &&
      scheduledAtUtc >= schedule.effectiveFromUtc
    ) {
      occurrences.push(
        toOccurrence(
          schedule.itemId,
          schedule.reminderTimeLocal,
          currentLocalDate,
          timezone,
          logsByScheduledAtUtc,
          nowUtc
        )
      );
    }

    if (schedule.recurrenceType === "once") {
      break;
    }

    const matchedLog = logsByScheduledAtUtc.get(scheduledAtUtc);

    if (isCompletionBased) {
      if (matchedLog?.action === "completed") {
        currentAnchorLocalDate = formatInTimeZone(
          matchedLog.actedAtUtc,
          timezone,
          "yyyy-MM-dd"
        );
        currentLocalDate = getNextLocalDate(
          schedule,
          currentAnchorLocalDate,
          currentAnchorLocalDate
        );
      } else {
        currentLocalDate = getNextLocalDate(
          schedule,
          currentLocalDate,
          currentAnchorLocalDate
        );
      }
    } else {
      currentLocalDate = getNextFixedLocalDate(schedule, currentLocalDate);
    }

    occurrenceCount += 1;
    assertOccurrenceLimit(occurrenceCount);
  }

  return occurrences;
}

function findNextOccurrenceForVersion(params: {
  completionLogs: CompletionLog[];
  logsByScheduledAtUtc: Map<string, CompletionLog>;
  nowUtc: string;
  schedule: ScheduleContext;
  timezone: string;
  versionEndUtc: string | null;
}): DerivedOccurrence | null {
  const {
    completionLogs,
    logsByScheduledAtUtc,
    nowUtc,
    schedule,
    timezone,
    versionEndUtc,
  } = params;
  const isCompletionBased =
    schedule.anchorType === "completion_based" &&
    supportsCompletionBasedRecurrence(schedule.recurrenceType);
  const initialAnchorLocalDate = isCompletionBased
    ? getInitialCompletionAnchorLocalDate(
        schedule.itemId,
        schedule.effectiveFromUtc,
        schedule.seedStartDateLocal,
        timezone,
        completionLogs
      )
    : schedule.seedStartDateLocal;
  let currentLocalDate = getInitialOccurrenceLocalDate(schedule);
  let currentAnchorLocalDate = initialAnchorLocalDate;
  let occurrenceCount = 0;

  while (currentLocalDate) {
    if (isPastScheduleEndDate(schedule, currentLocalDate)) {
      return null;
    }

    const scheduledAtUtc = getScheduledAtUtc(
      currentLocalDate,
      schedule.reminderTimeLocal,
      timezone
    );

    if (versionEndUtc && scheduledAtUtc >= versionEndUtc) {
      return null;
    }

    const occurrence = toOccurrence(
      schedule.itemId,
      schedule.reminderTimeLocal,
      currentLocalDate,
      timezone,
      logsByScheduledAtUtc,
      nowUtc
    );

    if (
      occurrence.status === "scheduled" &&
      scheduledAtUtc >= nowUtc &&
      scheduledAtUtc >= schedule.effectiveFromUtc
    ) {
      return occurrence;
    }

    if (schedule.recurrenceType === "once") {
      return null;
    }

    const matchedLog = logsByScheduledAtUtc.get(scheduledAtUtc);

    if (isCompletionBased) {
      if (matchedLog?.action === "completed") {
        currentAnchorLocalDate = formatInTimeZone(
          matchedLog.actedAtUtc,
          timezone,
          "yyyy-MM-dd"
        );
        currentLocalDate = getNextLocalDate(
          schedule,
          currentAnchorLocalDate,
          currentAnchorLocalDate
        );
      } else {
        currentLocalDate = getNextLocalDate(
          schedule,
          currentLocalDate,
          currentAnchorLocalDate
        );
      }
    } else {
      currentLocalDate = getNextFixedLocalDate(schedule, currentLocalDate);
    }

    occurrenceCount += 1;
    assertOccurrenceLimit(occurrenceCount);
  }

  return null;
}

function getPreviousOccurrenceLocalDate(
  item: RecurringItem,
  effectiveFromUtc: string,
  timezone: string,
  completionLogs: CompletionLog[]
): string | null {
  const rangeStartUtc = fromZonedTime(
    `${item.startDateLocal}T00:00:00.000`,
    timezone
  ).toISOString();
  const occurrences = getOccurrencesInRange(
    item,
    rangeStartUtc,
    effectiveFromUtc,
    timezone,
    completionLogs,
    effectiveFromUtc
  ).filter((occurrence) => occurrence.scheduledAtUtc < effectiveFromUtc);

  return occurrences[occurrences.length - 1]?.localDate ?? null;
}

function findFirstFutureLocalDate(params: {
  completionLogs: CompletionLog[];
  effectiveFromUtc: string;
  initialAnchorLocalDate: string;
  schedule: ScheduleContext;
  timezone: string;
}): string | null {
  const {
    completionLogs,
    effectiveFromUtc,
    initialAnchorLocalDate,
    schedule,
    timezone,
  } = params;
  const logsByScheduledAtUtc = buildLogsByScheduledAtUtc(
    schedule.itemId,
    completionLogs
  );
  const isCompletionBased =
    schedule.anchorType === "completion_based" &&
    supportsCompletionBasedRecurrence(schedule.recurrenceType);
  let currentLocalDate = getInitialOccurrenceLocalDate(schedule);
  let currentAnchorLocalDate = initialAnchorLocalDate;
  let occurrenceCount = 0;

  while (currentLocalDate) {
    if (isPastScheduleEndDate(schedule, currentLocalDate)) {
      return null;
    }

    const scheduledAtUtc = getScheduledAtUtc(
      currentLocalDate,
      schedule.reminderTimeLocal,
      timezone
    );

    if (scheduledAtUtc >= effectiveFromUtc) {
      return currentLocalDate;
    }

    if (schedule.recurrenceType === "once") {
      return null;
    }

    const matchedLog = logsByScheduledAtUtc.get(scheduledAtUtc);

    if (isCompletionBased) {
      if (matchedLog?.action === "completed") {
        currentAnchorLocalDate = formatInTimeZone(
          matchedLog.actedAtUtc,
          timezone,
          "yyyy-MM-dd"
        );
        currentLocalDate = getNextLocalDate(
          schedule,
          currentAnchorLocalDate,
          currentAnchorLocalDate
        );
      } else {
        currentLocalDate = getNextLocalDate(
          schedule,
          currentLocalDate,
          currentAnchorLocalDate
        );
      }
    } else {
      currentLocalDate = getNextFixedLocalDate(schedule, currentLocalDate);
    }

    occurrenceCount += 1;
    assertOccurrenceLimit(occurrenceCount);
  }

  return null;
}

export function resolveOccurrenceStatus(
  scheduledAtUtc: string,
  logsByScheduledAtUtc: Map<string, CompletionLog>,
  nowUtc: string,
  timezone: string
): OccurrenceStatus {
  const matchedLog = logsByScheduledAtUtc.get(scheduledAtUtc);

  if (matchedLog?.action === "completed") {
    return "completed";
  }

  if (matchedLog?.action === "skipped") {
    return "skipped";
  }

  const scheduledLocalDate = formatInTimeZone(
    scheduledAtUtc,
    timezone,
    "yyyy-MM-dd"
  );
  const nowLocalDate = formatInTimeZone(nowUtc, timezone, "yyyy-MM-dd");

  if (compareLocalDate(scheduledLocalDate, nowLocalDate) < 0) {
    return "overdue";
  }

  return "scheduled";
}

export function getLastCompletedLog(
  itemId: string,
  logs: CompletionLog[]
): CompletionLog | null {
  return findLastCompletedLog(itemId, logs);
}

export function getOccurrencesInRange(
  item: RecurringItem,
  rangeStartUtc: string,
  rangeEndUtc: string,
  timezone: string,
  completionLogs: CompletionLog[],
  nowUtc: string = new Date().toISOString()
): DerivedOccurrence[] {
  const versions = getScheduleVersions(item);
  const logsByScheduledAtUtc = buildLogsByScheduledAtUtc(
    item.id,
    completionLogs
  );

  return versions.flatMap((version, index) =>
    collectOccurrencesForVersion({
      completionLogs,
      logsByScheduledAtUtc,
      nowUtc,
      rangeEndUtc,
      rangeStartUtc,
      schedule: toScheduleContext(item, version),
      timezone,
      versionEndUtc: getVersionEndUtc(versions, index),
    }).filter((occurrence) =>
      isUtcWithinRange(occurrence.scheduledAtUtc, rangeStartUtc, rangeEndUtc)
    )
  );
}

export function getNextOccurrence(
  item: RecurringItem,
  nowUtc: string,
  timezone: string,
  completionLogs: CompletionLog[]
): DerivedOccurrence | null {
  const versions = getScheduleVersions(item);
  const logsByScheduledAtUtc = buildLogsByScheduledAtUtc(
    item.id,
    completionLogs
  );

  for (let index = 0; index < versions.length; index += 1) {
    const nextOccurrence = findNextOccurrenceForVersion({
      completionLogs,
      logsByScheduledAtUtc,
      nowUtc,
      schedule: toScheduleContext(item, versions[index]!),
      timezone,
      versionEndUtc: getVersionEndUtc(versions, index),
    });

    if (nextOccurrence) {
      return nextOccurrence;
    }
  }

  return null;
}

export function getFirstFutureOccurrenceLocalDateAfterEdit(params: {
  completionLogs: CompletionLog[];
  effectiveFromUtc: string;
  item: RecurringItem;
  nextSchedule: Pick<
    RecurringItemScheduleVersion,
    | "anchorType"
    | "intervalValue"
    | "recurrenceType"
    | "reminderTimeLocal"
    | "weekdayMask"
  >;
  timezone: string;
}): string | null {
  const { completionLogs, effectiveFromUtc, item, nextSchedule, timezone } =
    params;
  const previousOccurrenceLocalDate =
    getPreviousOccurrenceLocalDate(
      item,
      effectiveFromUtc,
      timezone,
      completionLogs
    ) ?? item.startDateLocal;
  const initialAnchorLocalDate =
    nextSchedule.anchorType === "completion_based" &&
    supportsCompletionBasedRecurrence(nextSchedule.recurrenceType)
      ? getInitialCompletionAnchorLocalDate(
          item.id,
          effectiveFromUtc,
          previousOccurrenceLocalDate,
          timezone,
          completionLogs
        )
      : previousOccurrenceLocalDate;

  return findFirstFutureLocalDate({
    completionLogs,
    effectiveFromUtc,
    initialAnchorLocalDate,
    schedule: {
      anchorType: nextSchedule.anchorType,
      endDateLocal: null,
      effectiveFromUtc,
      itemId: item.id,
      intervalValue: nextSchedule.intervalValue,
      recurrenceType: nextSchedule.recurrenceType,
      reminderTimeLocal: nextSchedule.reminderTimeLocal,
      seedStartDateLocal: previousOccurrenceLocalDate,
      weekdayMask: nextSchedule.weekdayMask,
    },
    timezone,
  });
}

export function getOccurrenceIdentity(
  itemId: string,
  scheduledAtUtc: string
): string {
  return `${itemId}:${scheduledAtUtc}`;
}
