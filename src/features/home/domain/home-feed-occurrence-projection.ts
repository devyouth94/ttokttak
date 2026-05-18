import { addDays, format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import {
  createLocalDateUtcRange,
  type LocalDateUtcRange,
} from "~/features/recurring/domain/occurrence-projection";
import type { RecurringItem } from "~/features/recurring/domain/types";
import {
  completionBasedRecurrenceTypes,
  getCurrentScheduleVersion,
} from "~/features/recurring/domain/types";

export const HOME_OVERDUE_LOOKBACK_DAYS = 730;
export const HOME_UPCOMING_RANGE_DAYS = 14;

export type HomeFeedCompletionLogQueryRequirement = {
  anchorItemIds: string[];
  rangeEndUtc: string;
  rangeStartUtc: string;
};

export type HomeFeedOccurrenceProjectionRequirement = {
  completionLogQuery: HomeFeedCompletionLogQueryRequirement;
  projection: {
    overdueLookbackStartLocalDate: string;
    selectedDateRange: LocalDateUtcRange;
    upcomingRange: LocalDateUtcRange | null;
  };
};

export function getHomeFeedOccurrenceProjectionRequirement({
  items,
  now,
  selectedDateId,
  timezone,
}: {
  items: RecurringItem[];
  now: Date;
  selectedDateId: string;
  timezone: string;
}): HomeFeedOccurrenceProjectionRequirement {
  const todayLocalDate = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const overdueLookbackStartLocalDate = addDaysToLocalDate(
    todayLocalDate,
    -HOME_OVERDUE_LOOKBACK_DAYS
  );
  const upcomingStartLocalDate = addDaysToLocalDate(todayLocalDate, 1);
  const upcomingEndLocalDate = addDaysToLocalDate(
    todayLocalDate,
    HOME_UPCOMING_RANGE_DAYS
  );
  const selectedDateRange = createLocalDateUtcRange(selectedDateId, timezone);
  const isTodaySelected = selectedDateId === todayLocalDate;
  const queryStartLocalDate = isTodaySelected
    ? overdueLookbackStartLocalDate
    : selectedDateId;
  const queryEndLocalDate = isTodaySelected
    ? upcomingEndLocalDate
    : selectedDateId;

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
