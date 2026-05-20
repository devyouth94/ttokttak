import { ko } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import type {
  CompletionLog,
  RecurringItem,
  RecurringItemColorKey,
} from "~/entities/schedule";
import {
  getNextItemOccurrenceEntries,
  getRecurrenceLabel,
} from "~/entities/schedule";

export type ScheduleListEntry = {
  colorKey: RecurringItemColorKey;
  id: string;
  item: RecurringItem;
  nextOccurrenceTimeLabel: string;
  nextScheduledAtUtc: string | null;
  recurrenceLabel: string;
  title: string;
};

export type ScheduleListSortMode = "createdDesc" | "titleAsc";

export const DEFAULT_SCHEDULE_LIST_SORT_MODE: ScheduleListSortMode = "titleAsc";

export function buildScheduleListEntries({
  completionLogs,
  items,
  now,
  sortMode = DEFAULT_SCHEDULE_LIST_SORT_MODE,
  timezone,
}: {
  completionLogs: CompletionLog[];
  items: RecurringItem[];
  now: Date;
  sortMode?: ScheduleListSortMode;
  timezone: string;
}): ScheduleListEntry[] {
  return getNextItemOccurrenceEntries({
    completionLogs,
    items,
    now,
    timezone,
  })
    .map(({ item, occurrence }) => ({
      colorKey: item.colorKey,
      id: item.id,
      item,
      nextOccurrenceTimeLabel: occurrence
        ? formatScheduleListNextOccurrenceTimeLabel(
            occurrence.scheduledAtUtc,
            timezone
          )
        : "예정 없음",
      nextScheduledAtUtc: occurrence?.scheduledAtUtc ?? null,
      recurrenceLabel: getRecurrenceLabel(item),
      title: item.title,
    }))
    .sort((left, right) => compareScheduleListEntries(left, right, sortMode));
}

export function formatScheduleListNextOccurrenceTimeLabel(
  scheduledAtUtc: string,
  timezone: string
): string {
  return formatInTimeZone(scheduledAtUtc, timezone, "a h:mm", {
    locale: ko,
  });
}

function compareScheduleListEntries(
  left: ScheduleListEntry,
  right: ScheduleListEntry,
  sortMode: ScheduleListSortMode
): number {
  return sortMode === "createdDesc"
    ? compareByCreatedAtDesc(left, right)
    : compareByTitleAsc(left, right);
}

function compareByCreatedAtDesc(
  left: ScheduleListEntry,
  right: ScheduleListEntry
): number {
  return (
    right.item.createdAt.localeCompare(left.item.createdAt) ||
    compareByTitleAsc(left, right)
  );
}

function compareByTitleAsc(
  left: ScheduleListEntry,
  right: ScheduleListEntry
): number {
  return (
    left.title.localeCompare(right.title, "ko") ||
    compareByCreatedAtDescOnly(left, right)
  );
}

function compareByCreatedAtDescOnly(
  left: ScheduleListEntry,
  right: ScheduleListEntry
): number {
  return right.item.createdAt.localeCompare(left.item.createdAt);
}
