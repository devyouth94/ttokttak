import { fromZonedTime } from "date-fns-tz";

import { getOccurrencesInRange } from "~/features/recurring/domain/occurrence";
import type {
  CompletionLog,
  DerivedOccurrence,
  RecurringItem,
} from "~/features/recurring/domain/types";

export function getOccurrencesToResolve({
  completionLogs,
  item,
  now,
  primaryOccurrence,
  timezone,
}: {
  completionLogs: CompletionLog[];
  item: RecurringItem;
  now: Date;
  primaryOccurrence: DerivedOccurrence | null;
  timezone: string;
}): DerivedOccurrence[] {
  if (!primaryOccurrence) {
    return [];
  }

  if (primaryOccurrence.status !== "overdue") {
    return [primaryOccurrence];
  }

  const rangeStartUtc = fromZonedTime(
    `${item.startDateLocal}T00:00:00.000`,
    timezone
  ).toISOString();

  return getOccurrencesInRange(
    item,
    rangeStartUtc,
    primaryOccurrence.scheduledAtUtc,
    timezone,
    completionLogs,
    now.toISOString()
  ).filter((occurrence) => occurrence.status === "overdue");
}
