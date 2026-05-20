import { addDays, endOfMonth, format, parse, startOfMonth } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import {
  createLocalDateUtcRange,
  type LocalDateUtcRange,
} from "./occurrence-projection";
import type { RecurringItem } from "./types";
import {
  completionBasedRecurrenceTypes,
  getCurrentScheduleVersion,
} from "./types";

const HOME_OVERDUE_LOOKBACK_DAYS = 730;
const HOME_UPCOMING_RANGE_DAYS = 14;
const REMINDER_LIST_COMPLETION_LOG_LOOKBACK_DAYS = 730;

export type OccurrenceProjectionCompletionLogQueryRequirement = {
  anchorItemIds: string[];
  rangeEndUtc: string;
  rangeStartUtc: string;
};

export type HomeFeedOccurrenceProjectionPurpose = {
  now: Date;
  selectedDateId: string;
  type: "homeFeed";
};

export type ReminderListOccurrenceProjectionPurpose = {
  now: Date;
  type: "reminderList";
};

export type CalendarMonthOccurrenceProjectionPurpose = {
  type: "calendarMonth";
  visibleMonth: string;
};

export type OccurrenceProjectionPurpose =
  | CalendarMonthOccurrenceProjectionPurpose
  | HomeFeedOccurrenceProjectionPurpose
  | ReminderListOccurrenceProjectionPurpose;

export type HomeFeedOccurrenceProjectionRequirement = {
  completionLogQuery: OccurrenceProjectionCompletionLogQueryRequirement;
  projection: {
    overdueLookbackStartLocalDate: string;
    selectedDateRange: LocalDateUtcRange;
    upcomingRange: LocalDateUtcRange | null;
  };
};

export type ReminderListOccurrenceProjectionRequirement = {
  completionLogQuery: OccurrenceProjectionCompletionLogQueryRequirement;
  projection: {
    todayLocalDate: string;
  };
};

export type CalendarMonthOccurrenceProjectionRequirement = {
  completionLogQuery: OccurrenceProjectionCompletionLogQueryRequirement;
  projection: {
    selectedMonthRange: LocalDateUtcRange;
  };
};

export type OccurrenceProjectionRequirement =
  | CalendarMonthOccurrenceProjectionRequirement
  | HomeFeedOccurrenceProjectionRequirement
  | ReminderListOccurrenceProjectionRequirement;

export function getOccurrenceProjectionRequirement({
  items,
  purpose,
  timezone,
}: {
  items: RecurringItem[];
  purpose: HomeFeedOccurrenceProjectionPurpose;
  timezone: string;
}): HomeFeedOccurrenceProjectionRequirement;
export function getOccurrenceProjectionRequirement({
  items,
  purpose,
  timezone,
}: {
  items: RecurringItem[];
  purpose: ReminderListOccurrenceProjectionPurpose;
  timezone: string;
}): ReminderListOccurrenceProjectionRequirement;
export function getOccurrenceProjectionRequirement({
  items,
  purpose,
  timezone,
}: {
  items: RecurringItem[];
  purpose: CalendarMonthOccurrenceProjectionPurpose;
  timezone: string;
}): CalendarMonthOccurrenceProjectionRequirement;
export function getOccurrenceProjectionRequirement({
  items,
  purpose,
  timezone,
}: {
  items: RecurringItem[];
  purpose: OccurrenceProjectionPurpose;
  timezone: string;
}): OccurrenceProjectionRequirement;
export function getOccurrenceProjectionRequirement({
  items,
  purpose,
  timezone,
}: {
  items: RecurringItem[];
  purpose: OccurrenceProjectionPurpose;
  timezone: string;
}): OccurrenceProjectionRequirement {
  switch (purpose.type) {
    case "calendarMonth":
      return getCalendarMonthOccurrenceProjectionRequirement({
        items,
        purpose,
        timezone,
      });
    case "homeFeed":
      return getHomeFeedOccurrenceProjectionRequirement({
        items,
        purpose,
        timezone,
      });
    case "reminderList":
      return getReminderListOccurrenceProjectionRequirement({
        items,
        purpose,
        timezone,
      });
  }
}

function getHomeFeedOccurrenceProjectionRequirement({
  items,
  purpose,
  timezone,
}: {
  items: RecurringItem[];
  purpose: HomeFeedOccurrenceProjectionPurpose;
  timezone: string;
}): HomeFeedOccurrenceProjectionRequirement {
  const todayLocalDate = formatInTimeZone(purpose.now, timezone, "yyyy-MM-dd");
  const overdueLookbackStartLocalDate = addDaysToLocalDate(
    todayLocalDate,
    -HOME_OVERDUE_LOOKBACK_DAYS
  );
  const upcomingStartLocalDate = addDaysToLocalDate(todayLocalDate, 1);
  const upcomingEndLocalDate = addDaysToLocalDate(
    todayLocalDate,
    HOME_UPCOMING_RANGE_DAYS
  );
  const selectedDateRange = createLocalDateUtcRange(
    purpose.selectedDateId,
    timezone
  );
  const isTodaySelected = purpose.selectedDateId === todayLocalDate;
  const queryStartLocalDate = isTodaySelected
    ? overdueLookbackStartLocalDate
    : purpose.selectedDateId;
  const queryEndLocalDate = isTodaySelected
    ? upcomingEndLocalDate
    : purpose.selectedDateId;

  return {
    completionLogQuery: {
      anchorItemIds: getCompletionBasedItemIds(items),
      rangeEndUtc: createLocalDateUtcRange(queryEndLocalDate, timezone).endUtc,
      rangeStartUtc: createLocalDateUtcRange(queryStartLocalDate, timezone)
        .startUtc,
    },
    projection: {
      overdueLookbackStartLocalDate,
      selectedDateRange,
      upcomingRange: isTodaySelected
        ? {
            endUtc: createLocalDateUtcRange(upcomingEndLocalDate, timezone)
              .endUtc,
            startUtc: createLocalDateUtcRange(upcomingStartLocalDate, timezone)
              .startUtc,
          }
        : null,
    },
  };
}

function getReminderListOccurrenceProjectionRequirement({
  items,
  purpose,
  timezone,
}: {
  items: RecurringItem[];
  purpose: ReminderListOccurrenceProjectionPurpose;
  timezone: string;
}): ReminderListOccurrenceProjectionRequirement {
  const todayLocalDate = formatInTimeZone(purpose.now, timezone, "yyyy-MM-dd");
  const startLocalDate = addDaysToLocalDate(
    todayLocalDate,
    -REMINDER_LIST_COMPLETION_LOG_LOOKBACK_DAYS
  );

  return {
    completionLogQuery: {
      anchorItemIds: getCompletionBasedItemIds(items),
      rangeEndUtc: createLocalDateUtcRange(todayLocalDate, timezone).endUtc,
      rangeStartUtc: createLocalDateUtcRange(startLocalDate, timezone).startUtc,
    },
    projection: {
      todayLocalDate,
    },
  };
}

function getCalendarMonthOccurrenceProjectionRequirement({
  items,
  purpose,
  timezone,
}: {
  items: RecurringItem[];
  purpose: CalendarMonthOccurrenceProjectionPurpose;
  timezone: string;
}): CalendarMonthOccurrenceProjectionRequirement {
  const visibleMonthDate = parse(
    `${purpose.visibleMonth}-01`,
    "yyyy-MM-dd",
    new Date()
  );
  const startLocalDate = format(startOfMonth(visibleMonthDate), "yyyy-MM-dd");
  const endLocalDate = format(endOfMonth(visibleMonthDate), "yyyy-MM-dd");

  return {
    completionLogQuery: {
      anchorItemIds: getCompletionBasedItemIds(items),
      rangeEndUtc: createLocalDateUtcRange(endLocalDate, timezone).endUtc,
      rangeStartUtc: createLocalDateUtcRange(startLocalDate, timezone).startUtc,
    },
    projection: {
      selectedMonthRange: {
        endUtc: createLocalDateUtcRange(endLocalDate, timezone).endUtc,
        startUtc: createLocalDateUtcRange(startLocalDate, timezone).startUtc,
      },
    },
  };
}

function getCompletionBasedItemIds(items: RecurringItem[]): string[] {
  return items
    .filter((item) => {
      const schedule = getCurrentScheduleVersion(item);
      const anchorType = schedule?.anchorType ?? item.anchorType;
      const recurrenceType = schedule?.recurrenceType ?? item.recurrenceType;

      return (
        anchorType === "completion_based" &&
        completionBasedRecurrenceTypes.includes(
          recurrenceType as (typeof completionBasedRecurrenceTypes)[number]
        )
      );
    })
    .map((item) => item.id);
}

function addDaysToLocalDate(localDate: string, amount: number): string {
  return format(
    addDays(parse(localDate, "yyyy-MM-dd", new Date()), amount),
    "yyyy-MM-dd"
  );
}
