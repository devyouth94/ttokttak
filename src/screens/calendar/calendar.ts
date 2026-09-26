import { formatInTimeZone } from "date-fns-tz";

import type { AppLanguage } from "~/i18n/language";
import { formatTimestamp } from "~/schedule/display/date";
import { getScheduleDisplayTitle } from "~/schedule/display/label";
import type { OccurrenceEntry, OccurrenceStatus } from "~/schedule/model";

const CALENDAR_MAX_VISIBLE_MARKERS = 5;

type CalendarDaySummary = {
  markerColors: string[];
  overflowCount: number;
};

export type CalendarDayEntry = {
  colorHex: string;
  itemId: string;
  scheduledAtUtc: string;
  status: OccurrenceStatus;
  timeLabel: string;
  title: string;
};

export function syncSelectedDateToTimezone({
  now,
  previousDate,
  previousTimezone,
  timezone,
}: {
  now: Date;
  previousDate: string;
  previousTimezone: string;
  timezone: string;
}): string {
  return previousDate === formatInTimeZone(now, previousTimezone, "yyyy-MM-dd")
    ? formatInTimeZone(now, timezone, "yyyy-MM-dd")
    : previousDate;
}

export function buildCalendarDaySummaries(
  entries: OccurrenceEntry[]
): Record<string, CalendarDaySummary> {
  const entriesByDate = new Map<string, OccurrenceEntry[]>();

  for (const entry of entries) {
    const localDate = entry.occurrence.localDate;
    const dayEntries = entriesByDate.get(localDate);

    if (dayEntries) {
      dayEntries.push(entry);
    } else {
      entriesByDate.set(localDate, [entry]);
    }
  }

  return Object.fromEntries(
    Array.from(entriesByDate.entries()).map(([localDate, dayEntries]) => {
      const markerColors = dayEntries
        .slice()
        .sort((left, right) =>
          left.occurrence.scheduledAtUtc.localeCompare(
            right.occurrence.scheduledAtUtc
          )
        )
        .slice(0, CALENDAR_MAX_VISIBLE_MARKERS)
        .map(({ schedule }) => schedule.colorHex);

      return [
        localDate,
        {
          markerColors,
          overflowCount: Math.max(
            0,
            dayEntries.length - CALENDAR_MAX_VISIBLE_MARKERS
          ),
        },
      ];
    })
  );
}

export function buildCalendarDayEntries({
  entries,
  language,
  selectedDate,
  timezone,
  unavailableTitle,
}: {
  entries: OccurrenceEntry[];
  language: AppLanguage;
  selectedDate: string;
  timezone: string;
  unavailableTitle: string;
}): CalendarDayEntry[] {
  return entries
    .filter((entry) => entry.occurrence.localDate === selectedDate)
    .map(({ schedule, occurrence }) => ({
      colorHex: schedule.colorHex,
      itemId: schedule.id,
      scheduledAtUtc: occurrence.scheduledAtUtc,
      status: occurrence.status,
      timeLabel: formatTimestamp(
        occurrence.scheduledAtUtc,
        timezone,
        "time",
        language
      ),
      title: getScheduleDisplayTitle(schedule, unavailableTitle),
    }))
    .sort((left, right) => {
      const timeDifference = left.scheduledAtUtc.localeCompare(
        right.scheduledAtUtc
      );

      return timeDifference || left.title.localeCompare(right.title, language);
    });
}
