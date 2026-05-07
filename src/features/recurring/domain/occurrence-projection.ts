import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import {
  getNextOccurrence,
  getOccurrencesInRange,
} from "~/features/recurring/domain/occurrence";
import type {
  CompletionLog,
  DerivedOccurrence,
  RecurringItem,
} from "~/features/recurring/domain/types";

export type LocalDateUtcRange = {
  endUtc: string;
  startUtc: string;
};

export type CreateItemOccurrenceProjectionParams = {
  completionLogs: CompletionLog[];
  item: RecurringItem;
  now: Date;
  timezone: string;
};

export type GetBasisOccurrenceOptions = {
  fallbackOccurrence?: DerivedOccurrence | null;
  scheduledAtUtc?: string;
};

export type GetOverdueOccurrencesOptions = {
  lookbackStartLocalDate: string;
  order?: "scheduledAtAsc" | "scheduledAtDesc";
  rangeEndUtc?: string;
};

export type ItemOccurrenceProjection = {
  getBasisOccurrence: (
    options?: GetBasisOccurrenceOptions
  ) => DerivedOccurrence | null;
  getLatestOverdueOccurrence: (
    options: GetOverdueOccurrencesOptions
  ) => DerivedOccurrence | null;
  getNextOccurrence: () => DerivedOccurrence | null;
  getOccurrencesInRange: (range: LocalDateUtcRange) => DerivedOccurrence[];
  getOverdueOccurrences: (
    options: GetOverdueOccurrencesOptions
  ) => DerivedOccurrence[];
  getScheduledOccurrencesInRange: (
    range: LocalDateUtcRange
  ) => DerivedOccurrence[];
};

export function createLocalDateUtcRange(
  localDate: string,
  timezone: string
): LocalDateUtcRange {
  return {
    endUtc: fromZonedTime(`${localDate}T23:59:59.999`, timezone).toISOString(),
    startUtc: fromZonedTime(
      `${localDate}T00:00:00.000`,
      timezone
    ).toISOString(),
  };
}

export function createItemOccurrenceProjection({
  completionLogs,
  item,
  now,
  timezone,
}: CreateItemOccurrenceProjectionParams): ItemOccurrenceProjection {
  const nowUtc = now.toISOString();

  function getProjectionOccurrencesInRange(
    range: LocalDateUtcRange
  ): DerivedOccurrence[] {
    return getOccurrencesInRange(
      item,
      range.startUtc,
      range.endUtc,
      timezone,
      completionLogs,
      nowUtc
    );
  }

  function getOverdueOccurrences({
    lookbackStartLocalDate,
    order = "scheduledAtAsc",
    rangeEndUtc = nowUtc,
  }: GetOverdueOccurrencesOptions): DerivedOccurrence[] {
    const overdueOccurrences = getOccurrencesInRange(
      item,
      createLocalDateUtcRange(lookbackStartLocalDate, timezone).startUtc,
      rangeEndUtc,
      timezone,
      completionLogs,
      nowUtc
    ).filter((occurrence) => occurrence.status === "overdue");

    return order === "scheduledAtDesc"
      ? overdueOccurrences.sort(compareOccurrencesByScheduledAtUtcDesc)
      : overdueOccurrences.sort(compareOccurrencesByScheduledAtUtcAsc);
  }

  function getBasisOccurrence({
    fallbackOccurrence = null,
    scheduledAtUtc,
  }: GetBasisOccurrenceOptions = {}): DerivedOccurrence | null {
    if (!scheduledAtUtc) {
      return fallbackOccurrence;
    }

    const matchingLog = completionLogs.find(
      (log) => log.itemId === item.id && log.scheduledAtUtc === scheduledAtUtc
    );

    if (matchingLog) {
      return {
        itemId: item.id,
        localDate: formatInTimeZone(scheduledAtUtc, timezone, "yyyy-MM-dd"),
        localTime: formatInTimeZone(scheduledAtUtc, timezone, "HH:mm"),
        scheduledAtLocal: formatInTimeZone(
          scheduledAtUtc,
          timezone,
          "yyyy-MM-dd'T'HH:mm:ss"
        ),
        scheduledAtUtc,
        status: matchingLog.action,
      };
    }

    return (
      getOccurrencesInRange(
        item,
        createLocalDateUtcRange(item.startDateLocal, timezone).startUtc,
        scheduledAtUtc,
        timezone,
        completionLogs,
        nowUtc
      ).find((occurrence) => occurrence.scheduledAtUtc === scheduledAtUtc) ??
      null
    );
  }

  return {
    getBasisOccurrence,
    getLatestOverdueOccurrence: (options) =>
      getOverdueOccurrences({ ...options, order: "scheduledAtDesc" })[0] ??
      null,
    getNextOccurrence: () =>
      getNextOccurrence(item, nowUtc, timezone, completionLogs),
    getOccurrencesInRange: getProjectionOccurrencesInRange,
    getOverdueOccurrences,
    getScheduledOccurrencesInRange: (range) =>
      getProjectionOccurrencesInRange(range).filter(
        (occurrence) => occurrence.status === "scheduled"
      ),
  };
}

function compareOccurrencesByScheduledAtUtcDesc(
  left: DerivedOccurrence,
  right: DerivedOccurrence
): number {
  return right.scheduledAtUtc.localeCompare(left.scheduledAtUtc);
}

function compareOccurrencesByScheduledAtUtcAsc(
  left: DerivedOccurrence,
  right: DerivedOccurrence
): number {
  return left.scheduledAtUtc.localeCompare(right.scheduledAtUtc);
}
