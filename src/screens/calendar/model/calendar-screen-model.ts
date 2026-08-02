import { addMonths, format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import type { AppLanguage } from "~/i18n/app-language";
import type { ColorKey } from "~/schedule/display/color";
import { formatTimestamp } from "~/schedule/display/date";
import type {
  OccurrenceEntry,
  OccurrenceStatus,
} from "~/schedule/rules/occurrence";
import type { Schedule } from "~/schedule/schedule";

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
  markerColorKeys: ColorKey[];
  occurrenceCount: number;
  overflowCount: number;
};

export type CalendarDayEntry = {
  colorKey: ColorKey;
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

export function getMinimumVisibleMonth(items: Schedule[]): string | null {
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
  visibleMonthEntries: OccurrenceEntry[];
}): Record<string, CalendarDaySummary> {
  const summaryMap = new Map<
    string,
    { markerItems: CalendarMarkerItem[]; occurrenceCount: number }
  >();

  visibleMonthEntries.forEach(({ schedule, occurrence }) => {
    const summary = summaryMap.get(occurrence.localDate) ?? {
      markerItems: [],
      occurrenceCount: 0,
    };

    summary.occurrenceCount += 1;
    summary.markerItems.push({
      colorKey: schedule.colorKey,
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
  selectedDateEntries: OccurrenceEntry[];
  timezone: string;
}): CalendarDayEntry[] {
  return selectedDateEntries
    .map(({ schedule, occurrence }) => ({
      colorKey: schedule.colorKey,
      itemId: schedule.id,
      scheduledAtUtc: occurrence.scheduledAtUtc,
      status: occurrence.status,
      statusLabel: calendarStatusLabelByStatus[language][occurrence.status],
      timeLabel: formatTimestamp(
        occurrence.scheduledAtUtc,
        timezone,
        "time",
        language
      ),
      title: schedule.title,
    }))
    .sort((left, right) => compareCalendarEntries(left, right, language));
}

type CalendarMarkerItem = {
  colorKey: ColorKey;
  scheduledAtUtc: string;
};

function getCalendarMarkerColorKeysByTime(
  markerItems: CalendarMarkerItem[]
): ColorKey[] {
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
