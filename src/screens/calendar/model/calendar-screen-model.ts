import { addMonths, format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import type {
  ItemOccurrenceProjectionEntry,
  OccurrenceStatus,
  RecurringItem,
  RecurringItemColorKey,
} from "~/entities/schedule";
import {
  formatUtcTimeInTimezone,
  formatVisibleMonthTitle as formatScheduleVisibleMonthTitle,
  formatWeekdayLocalDateTitle,
} from "~/entities/schedule";
import type { AppLanguage } from "~/shared/i18n";

export const CALENDAR_MAX_VISIBLE_MARKERS = 5;

const calendarStatusLabelByStatus = {
  en: {
    completed: "Complete",
    overdue: "Overdue",
    scheduled: "Scheduled",
    skipped: "Skip",
  },
  ko: {
    completed: "완료",
    overdue: "지남",
    scheduled: "예정",
    skipped: "건너뜀",
  },
} as const satisfies Record<AppLanguage, Record<OccurrenceStatus, string>>;

const calendarDayEntryCountFormatters = {
  en: (count: number) => (count === 1 ? "1 item" : `${count} items`),
  ko: (count: number) => `${count}개`,
} as const satisfies Record<AppLanguage, (count: number) => string>;

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

export function formatVisibleMonthTitle(
  visibleMonth: string,
  language: AppLanguage = "ko"
): string {
  return formatScheduleVisibleMonthTitle(visibleMonth, language);
}

export function formatSelectedDateSectionTitle(
  selectedDate: string,
  language: AppLanguage = "ko"
): string {
  return formatWeekdayLocalDateTitle(selectedDate, language);
}

export function formatCalendarDayEntryCount(
  count: number,
  language: AppLanguage = "ko"
): string {
  return calendarDayEntryCountFormatters[language](count);
}

export const calendarLocaleConfigByLanguage = {
  en: {
    dayNames: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    monthNames: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    monthNamesShort: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    today: "Today",
  },
  ko: {
    dayNames: [
      "일요일",
      "월요일",
      "화요일",
      "수요일",
      "목요일",
      "금요일",
      "토요일",
    ],
    dayNamesShort: ["일", "월", "화", "수", "목", "금", "토"],
    monthNames: [
      "1월",
      "2월",
      "3월",
      "4월",
      "5월",
      "6월",
      "7월",
      "8월",
      "9월",
      "10월",
      "11월",
      "12월",
    ],
    monthNamesShort: [
      "1월",
      "2월",
      "3월",
      "4월",
      "5월",
      "6월",
      "7월",
      "8월",
      "9월",
      "10월",
      "11월",
      "12월",
    ],
    today: "오늘",
  },
} as const satisfies Record<
  AppLanguage,
  {
    dayNames: string[];
    dayNamesShort: string[];
    monthNames: string[];
    monthNamesShort: string[];
    today: string;
  }
>;

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
  visibleMonthEntries,
}: {
  visibleMonthEntries: ItemOccurrenceProjectionEntry[];
}): Record<string, CalendarDaySummary> {
  const summaryMap = new Map<
    string,
    { markerItems: CalendarMarkerItem[]; occurrenceCount: number }
  >();

  visibleMonthEntries.forEach(({ item, occurrence }) => {
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
  language,
  selectedDateEntries,
  timezone,
}: {
  language: AppLanguage;
  selectedDateEntries: ItemOccurrenceProjectionEntry[];
  timezone: string;
}): CalendarDayEntry[] {
  return selectedDateEntries
    .map(({ item, occurrence }) => ({
      colorKey: item.colorKey,
      itemId: item.id,
      scheduledAtUtc: occurrence.scheduledAtUtc,
      status: occurrence.status,
      statusLabel: calendarStatusLabelByStatus[language][occurrence.status],
      timeLabel: formatUtcTimeInTimezone(
        occurrence.scheduledAtUtc,
        timezone,
        language
      ),
      title: item.title,
    }))
    .sort((left, right) => compareCalendarEntries(left, right, language));
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
  right: CalendarDayEntry,
  language: AppLanguage
): number {
  const timeDifference = left.scheduledAtUtc.localeCompare(
    right.scheduledAtUtc
  );

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return left.title.localeCompare(right.title, language);
}
