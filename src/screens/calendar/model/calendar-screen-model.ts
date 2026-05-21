import { addMonths, endOfMonth, format, parse, startOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import type {
  CompletionLog,
  OccurrenceStatus,
  RecurringItem,
  RecurringItemColorKey,
} from "~/entities/schedule";
import {
  createLocalDateUtcRange as createProjectionLocalDateUtcRange,
  formatUtcTimeInTimezone,
  getItemOccurrenceEntriesInRange,
} from "~/entities/schedule";

export const CALENDAR_MAX_VISIBLE_MARKERS = 5;

const calendarStatusLabelByStatus: Record<OccurrenceStatus, string> = {
  completed: "완료",
  overdue: "지남",
  scheduled: "예정",
  skipped: "건너뜀",
};

export type CalendarDaySummary = {
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

export function createCalendarScreenState(
  now: Date,
  timezone: string
): CalendarScreenState {
  return {
    selectedDate: formatInTimeZone(now, timezone, "yyyy-MM-dd"),
    visibleMonth: formatInTimeZone(now, timezone, "yyyy-MM"),
  };
}

export function syncCalendarScreenStateToTimezone({
  now,
  previousState,
  previousTimezone,
  timezone,
}: {
  now: Date;
  previousState: CalendarScreenState;
  previousTimezone: string;
  timezone: string;
}): CalendarScreenState {
  const previousTodayState = createCalendarScreenState(now, previousTimezone);
  const isViewingPreviousToday =
    previousState.selectedDate === previousTodayState.selectedDate &&
    previousState.visibleMonth === previousTodayState.visibleMonth;

  return isViewingPreviousToday
    ? createCalendarScreenState(now, timezone)
    : previousState;
}

function createVisibleMonthDate(visibleMonth: string): Date {
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

  getItemOccurrenceEntriesInRange({
    completionLogs,
    items,
    now,
    range: { endUtc, startUtc },
    timezone,
  }).forEach(({ item, occurrence }) => {
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

  return Object.fromEntries(
    Array.from(summaryMap.entries()).map(([localDate, summary]) => [
      localDate,
      {
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
  const { endUtc, startUtc } = createProjectionLocalDateUtcRange(
    selectedDate,
    timezone
  );

  return getItemOccurrenceEntriesInRange({
    completionLogs,
    items,
    now,
    range: { endUtc, startUtc },
    timezone,
  })
    .filter(({ occurrence }) => occurrence.localDate === selectedDate)
    .map(({ item, occurrence }) => ({
      colorKey: item.colorKey,
      itemId: item.id,
      scheduledAtUtc: occurrence.scheduledAtUtc,
      status: occurrence.status,
      statusLabel: calendarStatusLabelByStatus[occurrence.status],
      timeLabel: formatUtcTimeInTimezone(occurrence.scheduledAtUtc, timezone),
      title: item.title,
    }))
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
    endUtc: createProjectionLocalDateUtcRange(monthEndLocalDate, timezone)
      .endUtc,
    startUtc: createProjectionLocalDateUtcRange(monthStartLocalDate, timezone)
      .startUtc,
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
