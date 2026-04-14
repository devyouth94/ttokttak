import type { MarkedDates } from "react-native-calendars/src/types";
import { addMonths, endOfMonth, format, parse, startOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { fromZonedTime } from "date-fns-tz";

import { colors } from "~/design-system/tokens";
import { getOccurrencesInRange } from "~/features/recurring/domain/occurrence";
import type {
  CompletionLog,
  DerivedOccurrence,
  OccurrenceStatus,
  RecurringItem,
} from "~/features/recurring/domain/types";
import { formatUtcTimeInTimezone } from "~/features/recurring/utils/recurring-display";

const calendarMarkerStatusOrder = [
  "scheduled",
  "completed",
  "skipped",
  "overdue",
] as const;
const MAX_VISIBLE_MARKERS = 3;

const markerColorByStatus: Record<CalendarMarkerStatus, string> = {
  completed: colors.statusCompleted,
  overdue: colors.statusOverdue,
  scheduled: colors.statusScheduled,
  skipped: colors.statusSkipped,
};

export type CalendarMarkerStatus = (typeof calendarMarkerStatusOrder)[number];

export type CalendarDaySummary = {
  hasEntries: boolean;
  localDate: string;
  markerStatuses: CalendarMarkerStatus[];
  occurrenceCount: number;
  overflowCount: number;
};

export type CalendarDayEntry = {
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
    { occurrenceCount: number; statuses: CalendarMarkerStatus[] }
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
        occurrenceCount: 0,
        statuses: [],
      };

      summary.occurrenceCount += 1;
      summary.statuses.push(toCalendarMarkerStatus(occurrence));
      summaryMap.set(occurrence.localDate, summary);
    });
  });

  return Object.fromEntries(
    Array.from(summaryMap.entries()).map(([localDate, summary]) => [
      localDate,
      {
        hasEntries: summary.occurrenceCount > 0,
        localDate,
        markerStatuses: sortCalendarMarkerStatuses(summary.statuses),
        occurrenceCount: summary.occurrenceCount,
        overflowCount: Math.max(
          0,
          summary.occurrenceCount - MAX_VISIBLE_MARKERS
        ),
      },
    ])
  );
}

export function createCalendarMarkedDates({
  daySummaries,
  selectedDate,
  todayDate,
}: {
  daySummaries: Record<string, CalendarDaySummary>;
  selectedDate: string;
  todayDate: string;
}): MarkedDates {
  const markedDates: MarkedDates = Object.fromEntries(
    Object.values(daySummaries).map((summary) => [
      summary.localDate,
      {
        dots: summary.markerStatuses.map((status, index) => ({
          color: markerColorByStatus[status],
          key: `${status}-${index}`,
          selectedDotColor: markerColorByStatus[status],
        })),
        marked: summary.hasEntries,
      },
    ])
  );
  const selectedMarkedDate = markedDates[selectedDate] ?? {};
  markedDates[selectedDate] = {
    ...selectedMarkedDate,
    selected: true,
  };

  const todayMarkedDate = markedDates[todayDate] ?? {};
  markedDates[todayDate] = {
    ...todayMarkedDate,
    today: true,
  };

  return markedDates;
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
          itemId: item.id,
          scheduledAtUtc: occurrence.scheduledAtUtc,
          status: occurrence.status,
          statusLabel: getCalendarStatusLabel(occurrence.status),
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

function sortCalendarMarkerStatuses(
  statuses: Iterable<CalendarMarkerStatus>
): CalendarMarkerStatus[] {
  return Array.from(statuses)
    .sort(
      (left, right) =>
        calendarMarkerStatusOrder.indexOf(left) -
        calendarMarkerStatusOrder.indexOf(right)
    )
    .slice(0, MAX_VISIBLE_MARKERS);
}

function toCalendarMarkerStatus(
  occurrence: DerivedOccurrence
): CalendarMarkerStatus {
  return occurrence.status;
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

function getCalendarStatusLabel(status: OccurrenceStatus): string {
  switch (status) {
    case "scheduled":
      return "예정";
    case "completed":
      return "완료";
    case "skipped":
      return "건너뜀";
    case "overdue":
      return "놓침";
  }
}
