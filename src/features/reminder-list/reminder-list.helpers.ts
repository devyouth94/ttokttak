import { ko } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import { getNextOccurrence } from "~/features/recurring/domain/occurrence";
import type {
  CompletionLog,
  RecurringItem,
} from "~/features/recurring/domain/types";
import { getRecurrenceLabel } from "~/features/recurring/utils/recurring-display";
import { formatRelativeDateLabelFromUtc } from "~/features/recurring/utils/relative-date-label";

export type ReminderListEntry = {
  id: string;
  item: RecurringItem;
  nextOccurrenceLabel: string;
  nextScheduledAtUtc: string | null;
  recurrenceLabel: string;
  title: string;
};

export type ReminderListSortMode = "createdDesc" | "titleAsc" | "nextAsc";

export const DEFAULT_REMINDER_LIST_SORT_MODE: ReminderListSortMode = "nextAsc";

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
        id: item.id,
        item,
        nextOccurrenceLabel: nextOccurrence
          ? formatReminderListNextOccurrenceLabel(
              nextOccurrence.scheduledAtUtc,
              now,
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

export function formatReminderListNextOccurrenceLabel(
  scheduledAtUtc: string,
  now: Date,
  timezone: string
): string {
  const dateLabel = formatRelativeDateLabelFromUtc({
    now,
    scheduledAtUtc,
    timezone,
  });
  const timeLabel = formatInTimeZone(scheduledAtUtc, timezone, "a h:mm", {
    locale: ko,
  });

  return `${dateLabel} ${timeLabel}`;
}

function compareReminderListEntries(
  left: ReminderListEntry,
  right: ReminderListEntry,
  sortMode: ReminderListSortMode
): number {
  if (sortMode === "titleAsc") {
    return compareByTitleAsc(left, right);
  }

  if (sortMode === "nextAsc") {
    return compareByNextScheduledAtAsc(left, right);
  }

  return compareByCreatedAtDesc(left, right);
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

function compareByNextScheduledAtAsc(
  left: ReminderListEntry,
  right: ReminderListEntry
): number {
  if (!left.nextScheduledAtUtc && right.nextScheduledAtUtc) {
    return 1;
  }

  if (left.nextScheduledAtUtc && !right.nextScheduledAtUtc) {
    return -1;
  }

  if (!left.nextScheduledAtUtc || !right.nextScheduledAtUtc) {
    return compareByCreatedAtDesc(left, right);
  }

  return (
    left.nextScheduledAtUtc.localeCompare(right.nextScheduledAtUtc) ||
    compareByCreatedAtDesc(left, right)
  );
}

function compareByCreatedAtDescOnly(
  left: ReminderListEntry,
  right: ReminderListEntry
): number {
  return right.item.createdAt.localeCompare(left.item.createdAt);
}
