import { formatInTimeZone } from "date-fns-tz";

import type {
  CompletionAction,
  CompletionLog,
  RecurringItem,
} from "~/features/recurring/domain/types";
import {
  formatLocalDateTitle,
  formatUtcTimeInTimezone,
  getCompletionActionLabel,
} from "~/features/recurring/utils/recurring-display";

export type HistoryEntry = {
  action: CompletionAction;
  id: string;
  itemId: string;
  localDate: string;
  scheduledAtUtc: string;
  statusLabel: string;
  timeLabel: string;
  title: string;
};

export type HistorySection = {
  id: string;
  items: HistoryEntry[];
  title: string;
};

export function buildHistorySections({
  completionLogs,
  items,
  timezone,
}: {
  completionLogs: CompletionLog[];
  items: RecurringItem[];
  timezone: string;
}): HistorySection[] {
  const itemById = new Map(items.map((item) => [item.id, item] as const));
  const entries = completionLogs
    .slice()
    .sort(compareLogsByScheduledAtUtcDesc)
    .flatMap((log) => {
      const item = itemById.get(log.itemId);

      if (!item) {
        return [];
      }

      const localDate = formatInTimeZone(
        log.scheduledAtUtc,
        timezone,
        "yyyy-MM-dd"
      );

      return [
        {
          action: log.action,
          id: log.id,
          itemId: item.id,
          localDate,
          scheduledAtUtc: log.scheduledAtUtc,
          statusLabel: getCompletionActionLabel(log.action),
          timeLabel: formatUtcTimeInTimezone(log.scheduledAtUtc, timezone),
          title: item.title,
        } satisfies HistoryEntry,
      ];
    });

  const sectionsByDate = new Map<string, HistoryEntry[]>();

  for (const entry of entries) {
    const currentEntries = sectionsByDate.get(entry.localDate) ?? [];
    currentEntries.push(entry);
    sectionsByDate.set(entry.localDate, currentEntries);
  }

  return Array.from(sectionsByDate.entries()).map(
    ([localDate, sectionItems]) => ({
      id: localDate,
      items: sectionItems,
      title: formatLocalDateTitle(localDate),
    })
  );
}

function compareLogsByScheduledAtUtcDesc(
  left: CompletionLog,
  right: CompletionLog
): number {
  return right.scheduledAtUtc.localeCompare(left.scheduledAtUtc);
}
