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

export function buildReminderListEntries({
  completionLogs,
  items,
  now,
  timezone,
}: {
  completionLogs: CompletionLog[];
  items: RecurringItem[];
  now: Date;
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
    .sort(compareReminderListEntries);
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
  right: ReminderListEntry
): number {
  if (!left.nextScheduledAtUtc && right.nextScheduledAtUtc) {
    return 1;
  }

  if (left.nextScheduledAtUtc && !right.nextScheduledAtUtc) {
    return -1;
  }

  return 0;
}
