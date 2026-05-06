import { ko } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import { getNextOccurrence } from "~/features/recurring/domain/occurrence";
import type {
  CompletionLog,
  RecurringItem,
  RecurringItemColorKey,
} from "~/features/recurring/domain/types";
import { getRecurrenceLabel } from "~/features/recurring/utils/recurring-display";

export type ReminderListEntry = {
  colorKey: RecurringItemColorKey;
  id: string;
  item: RecurringItem;
  nextOccurrenceTimeLabel: string;
  nextScheduledAtUtc: string | null;
  recurrenceLabel: string;
  title: string;
};

export type ReminderListSortMode = "createdDesc" | "titleAsc";

export const DEFAULT_REMINDER_LIST_SORT_MODE: ReminderListSortMode = "titleAsc";

export function buildReminderListEntries({
  completionLogs,
  items,
  now,
  sortMode = DEFAULT_REMINDER_LIST_SORT_MODE,
  timezone,
}: {
  completionLogs: CompletionLog[];
  items: RecurringItem[];
  now: Date;
  sortMode?: ReminderListSortMode;
  timezone: string;
}): ReminderListEntry[] {
  const nowUtc = now.toISOString();

  return items
    .map((item) => {
      const nextOccurrence = getNextOccurrence(
        item,
        nowUtc,
        timezone,
        completionLogs
      );

      return {
        colorKey: item.colorKey,
        id: item.id,
        item,
        nextOccurrenceTimeLabel: nextOccurrence
          ? formatReminderListNextOccurrenceTimeLabel(
              nextOccurrence.scheduledAtUtc,
              timezone
            )
          : "예정 없음",
        nextScheduledAtUtc: nextOccurrence?.scheduledAtUtc ?? null,
        recurrenceLabel: getRecurrenceLabel(item),
        title: item.title,
      };
    })
    .sort((left, right) => compareReminderListEntries(left, right, sortMode));
}

export function formatReminderListNextOccurrenceTimeLabel(
  scheduledAtUtc: string,
  timezone: string
): string {
  return formatInTimeZone(scheduledAtUtc, timezone, "a h:mm", {
    locale: ko,
  });
}

function compareReminderListEntries(
  left: ReminderListEntry,
  right: ReminderListEntry,
  sortMode: ReminderListSortMode
): number {
  return sortMode === "createdDesc"
    ? compareByCreatedAtDesc(left, right)
    : compareByTitleAsc(left, right);
}

function compareByCreatedAtDesc(
  left: ReminderListEntry,
  right: ReminderListEntry
): number {
  return (
    right.item.createdAt.localeCompare(left.item.createdAt) ||
    compareByTitleAsc(left, right)
  );
}

function compareByTitleAsc(
  left: ReminderListEntry,
  right: ReminderListEntry
): number {
  return (
    left.title.localeCompare(right.title, "ko") ||
    compareByCreatedAtDescOnly(left, right)
  );
}

function compareByCreatedAtDescOnly(
  left: ReminderListEntry,
  right: ReminderListEntry
): number {
  return right.item.createdAt.localeCompare(left.item.createdAt);
}
