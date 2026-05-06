import { addMonths, endOfMonth, format, parse, startOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { fromZonedTime } from "date-fns-tz";

import { getOccurrencesInRange } from "~/features/recurring/domain/occurrence";
import type {
  CompletionLog,
  OccurrenceStatus,
  RecurringItem,
  RecurringItemColorKey,
} from "~/features/recurring/domain/types";
import { formatUtcTimeInTimezone } from "~/features/recurring/utils/recurring-display";

export const CALENDAR_MAX_VISIBLE_MARKERS = 5;

export const calendarStatusLabelByStatus: Record<OccurrenceStatus, string> = {
  completed: "완료",
  overdue: "지남",
  scheduled: "예정",
  skipped: "건너뜀",
};

export type CalendarDaySummary = {
  hasEntries: boolean;
  localDate: string;
  markerColorKeys: RecurringItemColorKey[];
  occurrenceCount: number;
  overflowCount: number;
};

export type CalendarDayEntry = {
  colorKey: RecurringItemColorKey;
  itemId: string;
  scheduledAtUtc: string;
  status: OccurrenceStatus;
  statusLabel: string;
  timeLabel: string;
  title: string;
};

export type CalendarScreenState = {
  selectedDate: string;
  visibleMonth: string;
};

export function createCalendarScreenState(now: Date): CalendarScreenState {
  return {
    selectedDate: format(now, "yyyy-MM-dd"),
    visibleMonth: format(now, "yyyy-MM"),
  };
}

export function createVisibleMonthDate(visibleMonth: string): Date {
  return parse(`${visibleMonth}-01`, "yyyy-MM-dd", new Date());
}

export function formatVisibleMonthTitle(visibleMonth: string): string {
  return format(createVisibleMonthDate(visibleMonth), "yyyy년 M월", {
    locale: ko,
  });
}

export function formatSelectedDateSectionTitle(selectedDate: string): string {
  return format(parse(selectedDate, "yyyy-MM-dd", new Date()), "M월 d일 EEEE", {
    locale: ko,
  });
}

export function formatCalendarDayEntryMetaLine(
  entry: CalendarDayEntry
): string {
  return [entry.timeLabel, entry.statusLabel].join(" · ");
}

export function shiftVisibleMonth(
  visibleMonth: string,
  amount: number
): string {
  return format(
    addMonths(createVisibleMonthDate(visibleMonth), amount),
    "yyyy-MM"
  );
}

export function getMinimumVisibleMonth(items: RecurringItem[]): string | null {
  if (items.length === 0) {
    return null;
  }

  return items
    .map((item) => item.startDateLocal.slice(0, 7))
    .sort((left, right) => left.localeCompare(right))[0]!;
}

export function clampVisibleMonth(
  visibleMonth: string,
  minimumVisibleMonth: string | null
): string {
  if (!minimumVisibleMonth) {
    return visibleMonth;
  }

  return visibleMonth.localeCompare(minimumVisibleMonth) < 0
    ? minimumVisibleMonth
    : visibleMonth;
}

export function buildCalendarDaySummaries({
  completionLogs,
  items,
  now,
  timezone,
  visibleMonth,
}: {
  completionLogs: CompletionLog[];
  items: RecurringItem[];
  now: Date;
  timezone: string;
  visibleMonth: string;
}): Record<string, CalendarDaySummary> {
  const { endUtc, startUtc } = createVisibleMonthUtcRange(
    visibleMonth,
    timezone
  );
  const summaryMap = new Map<
    string,
    { markerItems: CalendarMarkerItem[]; occurrenceCount: number }
  >();

  items.forEach((item) => {
    const occurrences = getOccurrencesInRange(
      item,
      startUtc,
      endUtc,
      timezone,
      completionLogs,
      now.toISOString()
    );

    occurrences.forEach((occurrence) => {
      const summary = summaryMap.get(occurrence.localDate) ?? {
        markerItems: [],
        occurrenceCount: 0,
      };

      summary.occurrenceCount += 1;
      summary.markerItems.push({
        colorKey: item.colorKey,
        scheduledAtUtc: occurrence.scheduledAtUtc,
      });
      summaryMap.set(occurrence.localDate, summary);
    });
  });

  return Object.fromEntries(
    Array.from(summaryMap.entries()).map(([localDate, summary]) => [
      localDate,
      {
        hasEntries: summary.occurrenceCount > 0,
        localDate,
        markerColorKeys: getCalendarMarkerColorKeysByTime(summary.markerItems),
        occurrenceCount: summary.occurrenceCount,
        overflowCount: Math.max(
          0,
          summary.occurrenceCount - CALENDAR_MAX_VISIBLE_MARKERS
        ),
      },
    ])
  );
}

export function buildCalendarDayEntries({
  completionLogs,
  items,
  now,
  selectedDate,
  timezone,
}: {
  completionLogs: CompletionLog[];
  items: RecurringItem[];
  now: Date;
  selectedDate: string;
  timezone: string;
}): CalendarDayEntry[] {
  const { endUtc, startUtc } = createLocalDateUtcRange(selectedDate, timezone);

  return items
    .flatMap((item) =>
      getOccurrencesInRange(
        item,
        startUtc,
        endUtc,
        timezone,
        completionLogs,
        now.toISOString()
      )
        .filter((occurrence) => occurrence.localDate === selectedDate)
        .map((occurrence) => ({
          colorKey: item.colorKey,
          itemId: item.id,
          scheduledAtUtc: occurrence.scheduledAtUtc,
          status: occurrence.status,
          statusLabel: calendarStatusLabelByStatus[occurrence.status],
          timeLabel: formatUtcTimeInTimezone(
            occurrence.scheduledAtUtc,
            timezone
          ),
          title: item.title,
        }))
    )
    .sort(compareCalendarEntries);
}

function createVisibleMonthUtcRange(
  visibleMonth: string,
  timezone: string
): { endUtc: string; startUtc: string } {
  const visibleMonthDate = createVisibleMonthDate(visibleMonth);
  const monthStartLocalDate = format(
    startOfMonth(visibleMonthDate),
    "yyyy-MM-dd"
  );
  const monthEndLocalDate = format(endOfMonth(visibleMonthDate), "yyyy-MM-dd");

  return {
    endUtc: fromZonedTime(
      `${monthEndLocalDate}T23:59:59.999`,
      timezone
    ).toISOString(),
    startUtc: fromZonedTime(
      `${monthStartLocalDate}T00:00:00.000`,
      timezone
    ).toISOString(),
  };
}

function createLocalDateUtcRange(
  localDate: string,
  timezone: string
): { endUtc: string; startUtc: string } {
  return {
    endUtc: fromZonedTime(`${localDate}T23:59:59.999`, timezone).toISOString(),
    startUtc: fromZonedTime(
      `${localDate}T00:00:00.000`,
      timezone
    ).toISOString(),
  };
}

type CalendarMarkerItem = {
  colorKey: RecurringItemColorKey;
  scheduledAtUtc: string;
};

function getCalendarMarkerColorKeysByTime(
  markerItems: CalendarMarkerItem[]
): RecurringItemColorKey[] {
  return markerItems
    .slice()
    .sort(compareCalendarMarkerItemsByScheduledAtUtc)
    .slice(0, CALENDAR_MAX_VISIBLE_MARKERS)
    .map((markerItem) => markerItem.colorKey);
}

function compareCalendarMarkerItemsByScheduledAtUtc(
  left: CalendarMarkerItem,
  right: CalendarMarkerItem
): number {
  return left.scheduledAtUtc.localeCompare(right.scheduledAtUtc);
}

function compareCalendarEntries(
  left: CalendarDayEntry,
  right: CalendarDayEntry
): number {
  const timeDifference = left.scheduledAtUtc.localeCompare(
    right.scheduledAtUtc
  );

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return left.title.localeCompare(right.title, "ko");
}
