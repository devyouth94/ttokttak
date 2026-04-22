import { differenceInCalendarDays, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import { getNextOccurrence } from "~/features/recurring/domain/occurrence";
import type {
  CompletionLog,
  RecurrenceType,
  RecurringItem,
} from "~/features/recurring/domain/types";
import { getCurrentScheduleVersion } from "~/features/recurring/domain/types";
import { getRecurrenceLabel } from "~/features/recurring/utils/recurring-display";

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
      const currentSchedule = getCurrentScheduleVersion(item);

      return {
        id: item.id,
        item,
        nextOccurrenceLabel: nextOccurrence
          ? formatReminderListNextOccurrenceLabel(
              nextOccurrence.scheduledAtUtc,
              now,
              timezone,
              currentSchedule?.recurrenceType ?? item.recurrenceType
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
  timezone: string,
  recurrenceType: RecurrenceType
): string {
  const scheduledLocalDate = formatInTimeZone(
    scheduledAtUtc,
    timezone,
    "yyyy-MM-dd"
  );
  const nowLocalDate = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const dayDiff = differenceInCalendarDays(
    parse(scheduledLocalDate, "yyyy-MM-dd", new Date()),
    parse(nowLocalDate, "yyyy-MM-dd", new Date())
  );
  const timeLabel = formatInTimeZone(scheduledAtUtc, timezone, "a h:mm", {
    locale: ko,
  });

  const dateTimeLabel =
    dayDiff === 0
      ? `오늘 ${timeLabel}`
      : `${formatInTimeZone(scheduledAtUtc, timezone, "M월 d일", {
          locale: ko,
        })} ${timeLabel}`;

  if (recurrenceType !== "once") {
    return `다음 일정 ${dateTimeLabel}`;
  }

  return dateTimeLabel;
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
