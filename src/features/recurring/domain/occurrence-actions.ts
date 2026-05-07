import { createItemOccurrenceProjection } from "~/features/recurring/domain/occurrence-projection";
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

  return createItemOccurrenceProjection({
    completionLogs,
    item,
    now,
    timezone,
  }).getOverdueOccurrences({
    lookbackStartLocalDate: item.startDateLocal,
    rangeEndUtc: primaryOccurrence.scheduledAtUtc,
  });
}
