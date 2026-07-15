import {
  addDays,
  differenceInCalendarDays,
  isAfter,
  isBefore,
  isEqual,
} from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import type {
  CompletionLog,
  DerivedOccurrence,
  OccurrenceStatus,
  RecurrenceType,
  RecurringItem,
  RecurringItemScheduleVersion,
} from "./types";
import { completionBasedRecurrenceTypes } from "./types";

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

export function hasOccurrenceBetweenLocalDates(params: {
  endDateLocal: string;
  intervalValue: number | null | undefined;
  recurrenceType: RecurrenceType;
  startDateLocal: string;
  weekdayMask: number[] | null | undefined;
}): boolean {
  if (compareLocalDate(params.startDateLocal, params.endDateLocal) > 0) {
    return false;
  }

  if (
    params.recurrenceType !== "weekly" &&
    params.recurrenceType !== "interval_weeks"
  ) {
    return true;
  }

  const firstOccurrenceLocalDate = getNextWeeklyCandidateLocalDate(
    {
      intervalValue: params.intervalValue,
      recurrenceType: params.recurrenceType,
      seedStartDateLocal: params.startDateLocal,
      weekdayMask: params.weekdayMask,
    },
    params.startDateLocal
  );

  return (
    firstOccurrenceLocalDate != null &&
    compareLocalDate(firstOccurrenceLocalDate, params.endDateLocal) <= 0
  );
}

function getNextWeeklyCandidateLocalDate(
  schedule: Pick<
    ScheduleContext,
    "intervalValue" | "recurrenceType" | "seedStartDateLocal" | "weekdayMask"
  >,
  startLocalDate: string
): string | null {
  const weekdays = [...new Set(schedule.weekdayMask)]
    .filter(
      (weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6
    )
    .sort((left, right) => left - right);
  const weekInterval =
    schedule.recurrenceType === "interval_weeks"
      ? (schedule.intervalValue ?? 1)
      : 1;

  if (
    weekdays.length === 0 ||
    !Number.isInteger(weekInterval) ||
    weekInterval < 1
  ) {
    return null;
  }

  const minimumLocalDate = getMaxLocalDate(
    startLocalDate,
    schedule.seedStartDateLocal
  );
  const anchorDate = parseLocalDate(schedule.seedStartDateLocal);
  const minimumDate = parseLocalDate(minimumLocalDate);
  const anchorWeekStart = addDays(anchorDate, -anchorDate.getUTCDay());
  let candidateWeekStart = addDays(minimumDate, -minimumDate.getUTCDay());
  const weeksFromAnchor =
    differenceInCalendarDays(candidateWeekStart, anchorWeekStart) / 7;
  const weekRemainder = weeksFromAnchor % weekInterval;

  if (weekRemainder !== 0) {
    candidateWeekStart = addDays(
      candidateWeekStart,
      (weekInterval - weekRemainder) * 7
    );
  }

  for (const weekday of weekdays) {
    const candidateLocalDate = formatInTimeZone(
      addDays(candidateWeekStart, weekday),
      "UTC",
      "yyyy-MM-dd"
    );

    if (compareLocalDate(candidateLocalDate, minimumLocalDate) >= 0) {
      return candidateLocalDate;
    }
  }

  return formatInTimeZone(
    addDays(candidateWeekStart, weekInterval * 7 + weekdays[0]),
    "UTC",
    "yyyy-MM-dd"
  );
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
  schedule: Pick<
    ScheduleContext,
    "intervalValue" | "recurrenceType" | "seedStartDateLocal" | "weekdayMask"
  >
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

export function getFirstOccurrenceLocalDate(params: {
  intervalValue: number | null | undefined;
  recurrenceType: RecurrenceType;
  startDateLocal: string;
  weekdayMask: number[] | null | undefined;
}): string | null {
  return getInitialOccurrenceLocalDate({
    intervalValue: params.intervalValue,
    recurrenceType: params.recurrenceType,
    seedStartDateLocal: params.startDateLocal,
    weekdayMask: params.weekdayMask,
  });
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

type ScheduleOccurrenceCandidate = {
  localDate: string;
  scheduledAtUtc: string;
};

function getScheduleInitialAnchorLocalDate(params: {
  completionLogs: CompletionLog[];
  schedule: ScheduleContext;
  timezone: string;
}): string {
  const { completionLogs, schedule, timezone } = params;

  if (
    schedule.anchorType === "completion_based" &&
    supportsCompletionBasedRecurrence(schedule.recurrenceType)
  ) {
    return getInitialCompletionAnchorLocalDate(
      schedule.itemId,
      schedule.effectiveFromUtc,
      schedule.seedStartDateLocal,
      timezone,
      completionLogs
    );
  }

  return schedule.seedStartDateLocal;
}

function createScheduleOccurrenceCursor(params: {
  initialAnchorLocalDate: string;
  logsByScheduledAtUtc: Map<string, CompletionLog>;
  schedule: ScheduleContext;
  timezone: string;
}): {
  advance: (candidate: ScheduleOccurrenceCandidate) => void;
  current: () => ScheduleOccurrenceCandidate | null;
} {
  const { initialAnchorLocalDate, logsByScheduledAtUtc, schedule, timezone } =
    params;
  const isCompletionBased =
    schedule.anchorType === "completion_based" &&
    supportsCompletionBasedRecurrence(schedule.recurrenceType);
  let currentLocalDate = getInitialOccurrenceLocalDate(schedule);
  let currentAnchorLocalDate = initialAnchorLocalDate;
  let occurrenceCount = 0;

  return {
    advance: (candidate) => {
      if (schedule.recurrenceType === "once") {
        currentLocalDate = null;
        return;
      }

      const matchedLog = logsByScheduledAtUtc.get(candidate.scheduledAtUtc);

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
            candidate.localDate,
            currentAnchorLocalDate
          );
        }
      } else {
        currentLocalDate = getNextFixedLocalDate(schedule, candidate.localDate);
      }

      occurrenceCount += 1;
      assertOccurrenceLimit(occurrenceCount);
    },
    current: () => {
      if (
        !currentLocalDate ||
        isPastScheduleEndDate(schedule, currentLocalDate)
      ) {
        return null;
      }

      const localDate = currentLocalDate;
      const scheduledAtUtc = getScheduledAtUtc(
        localDate,
        schedule.reminderTimeLocal,
        timezone
      );

      return { localDate, scheduledAtUtc };
    },
  };
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
  const cursor = createScheduleOccurrenceCursor({
    initialAnchorLocalDate: getScheduleInitialAnchorLocalDate({
      completionLogs,
      schedule,
      timezone,
    }),
    logsByScheduledAtUtc,
    schedule,
    timezone,
  });
  let candidate = cursor.current();

  while (candidate) {
    const { localDate, scheduledAtUtc } = candidate;

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
          localDate,
          timezone,
          logsByScheduledAtUtc,
          nowUtc
        )
      );
    }

    cursor.advance(candidate);
    candidate = cursor.current();
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
  const cursor = createScheduleOccurrenceCursor({
    initialAnchorLocalDate: getScheduleInitialAnchorLocalDate({
      completionLogs,
      schedule,
      timezone,
    }),
    logsByScheduledAtUtc,
    schedule,
    timezone,
  });
  let candidate = cursor.current();

  while (candidate) {
    const { localDate, scheduledAtUtc } = candidate;

    if (versionEndUtc && scheduledAtUtc >= versionEndUtc) {
      return null;
    }

    const occurrence = toOccurrence(
      schedule.itemId,
      schedule.reminderTimeLocal,
      localDate,
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

    cursor.advance(candidate);
    candidate = cursor.current();
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
  const cursor = createScheduleOccurrenceCursor({
    initialAnchorLocalDate,
    logsByScheduledAtUtc,
    schedule,
    timezone,
  });
  let candidate = cursor.current();

  while (candidate) {
    const { localDate, scheduledAtUtc } = candidate;

    if (scheduledAtUtc >= effectiveFromUtc) {
      return localDate;
    }

    cursor.advance(candidate);
    candidate = cursor.current();
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

export function getOccurrencesInRange(
  item: RecurringItem,
  rangeStartUtc: string,
  rangeEndUtc: string,
  timezone: string,
  completionLogs: CompletionLog[],
  nowUtc: string = new Date().toISOString()
): DerivedOccurrence[] {
  const versions = item.scheduleVersions;
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
  const versions = item.scheduleVersions;
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
    | "endDateLocal"
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
      endDateLocal: nextSchedule.endDateLocal ?? null,
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
