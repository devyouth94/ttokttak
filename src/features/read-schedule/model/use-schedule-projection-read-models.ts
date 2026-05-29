import { useMemo } from "react";

import type {
  CompletionLog,
  DerivedOccurrence,
  ItemNextOccurrenceProjectionEntry,
  ItemOccurrenceProjectionEntry,
  RecurringItem,
} from "~/entities/schedule";
import {
  createItemOccurrenceProjection,
  createLocalDateUtcRange,
  getItemOccurrenceEntriesInRange,
  getLatestOverdueItemOccurrenceEntries,
  getNextItemOccurrenceEntries,
  getScheduledItemOccurrenceEntriesInRange,
} from "~/entities/schedule";

import type { ScheduleReadContext } from "./schedule-read-context";
import { useOccurrenceProjectionQuery } from "./use-occurrence-projection-query";
import { useScheduleCompletionLogsQuery } from "./use-schedule-completion-logs-query";
import { useScheduleByIdQuery } from "./use-schedule-items-query";

const EMPTY_COMPLETION_LOGS: CompletionLog[] = [];

type BaseScheduleProjectionReadModel = {
  completionLogs: CompletionLog[];
  error: unknown;
  isLoading: boolean;
  isReady: boolean;
  isRefreshing: boolean;
  items: RecurringItem[];
  refetch: () => Promise<void>;
  timezone: string;
  userId: string | null;
};

export type HomeFeedOccurrenceProjectionReadModel =
  BaseScheduleProjectionReadModel & {
    overdueEntries: ItemOccurrenceProjectionEntry[];
    selectedDateEntries: ItemOccurrenceProjectionEntry[];
    upcomingEntries: ItemOccurrenceProjectionEntry[];
  };

export type ScheduleListOccurrenceProjectionReadModel =
  BaseScheduleProjectionReadModel & {
    nextOccurrenceEntries: ItemNextOccurrenceProjectionEntry[];
  };

export type CalendarMonthOccurrenceProjectionReadModel =
  BaseScheduleProjectionReadModel & {
    selectedDateEntries: ItemOccurrenceProjectionEntry[];
    visibleMonthEntries: ItemOccurrenceProjectionEntry[];
  };

export type ScheduleDetailReadModel = {
  basisOccurrence: DerivedOccurrence | null;
  completionLogs: CompletionLog[];
  error: unknown;
  isLoading: boolean;
  isReady: boolean;
  item: RecurringItem | null;
  nextOccurrence: DerivedOccurrence | null;
  overdueOccurrences: DerivedOccurrence[];
  refetch: () => Promise<void>;
  timezone: string;
  userId: string | null;
};

export function useHomeFeedOccurrenceProjectionQuery({
  context,
  now,
  selectedDateId,
}: {
  context: ScheduleReadContext;
  now: Date;
  selectedDateId: string;
}): HomeFeedOccurrenceProjectionReadModel {
  const projectionQuery = useOccurrenceProjectionQuery({
    context,
    purpose: {
      now,
      selectedDateId,
      type: "homeFeed",
    },
  });
  const { completionLogs, items, projectionRequirement, timezone } =
    projectionQuery;
  const { overdueEntries, selectedDateEntries, upcomingEntries } = useMemo(
    () => ({
      overdueEntries: getLatestOverdueItemOccurrenceEntries({
        completionLogs,
        items,
        lookbackStartLocalDate:
          projectionRequirement.projection.overdueLookbackStartLocalDate,
        now,
        timezone,
      }),
      selectedDateEntries: getScheduledItemOccurrenceEntriesInRange({
        completionLogs,
        items,
        now,
        range: projectionRequirement.projection.selectedDateRange,
        timezone,
      }),
      upcomingEntries: projectionRequirement.projection.upcomingRange
        ? getScheduledItemOccurrenceEntriesInRange({
            completionLogs,
            items,
            now,
            range: projectionRequirement.projection.upcomingRange,
            timezone,
          })
        : [],
    }),
    [completionLogs, items, now, projectionRequirement, timezone]
  );

  return {
    ...projectionQuery,
    overdueEntries,
    selectedDateEntries,
    upcomingEntries,
  };
}

export function useScheduleListOccurrenceProjectionQuery({
  context,
  now,
}: {
  context: ScheduleReadContext;
  now: Date;
}): ScheduleListOccurrenceProjectionReadModel {
  const projectionQuery = useOccurrenceProjectionQuery({
    context,
    purpose: {
      now,
      type: "scheduleList",
    },
  });
  const { completionLogs, items, timezone } = projectionQuery;
  const nextOccurrenceEntries = useMemo(
    () =>
      getNextItemOccurrenceEntries({
        completionLogs,
        items,
        now,
        timezone,
      }),
    [completionLogs, items, now, timezone]
  );

  return {
    ...projectionQuery,
    nextOccurrenceEntries,
  };
}

export function useCalendarMonthOccurrenceProjectionQuery({
  context,
  now,
  selectedDate,
  visibleMonth,
}: {
  context: ScheduleReadContext;
  now: Date;
  selectedDate: string;
  visibleMonth: string;
}): CalendarMonthOccurrenceProjectionReadModel {
  const projectionQuery = useOccurrenceProjectionQuery({
    context,
    purpose: {
      type: "calendarMonth",
      visibleMonth,
    },
  });
  const { completionLogs, items, projectionRequirement, timezone } =
    projectionQuery;
  const { selectedDateEntries, visibleMonthEntries } = useMemo(() => {
    const selectedDateRange = createLocalDateUtcRange(selectedDate, timezone);

    return {
      selectedDateEntries: getItemOccurrenceEntriesInRange({
        completionLogs,
        items,
        now,
        range: selectedDateRange,
        timezone,
      }).filter((entry) => entry.occurrence.localDate === selectedDate),
      visibleMonthEntries: getItemOccurrenceEntriesInRange({
        completionLogs,
        items,
        now,
        range: projectionRequirement.projection.selectedMonthRange,
        timezone,
      }),
    };
  }, [
    completionLogs,
    items,
    now,
    projectionRequirement,
    selectedDate,
    timezone,
  ]);

  return {
    ...projectionQuery,
    selectedDateEntries,
    visibleMonthEntries,
  };
}

export function useScheduleDetailReadModelQuery({
  context,
  itemId,
  now,
  scheduledAtUtc,
}: {
  context: ScheduleReadContext;
  itemId: string | null;
  now: Date;
  scheduledAtUtc?: string;
}): ScheduleDetailReadModel {
  const { isReady, timezone, userId } = context;
  const itemQuery = useScheduleByIdQuery({
    enabled: isReady,
    itemId,
    timezone,
    userId,
  });
  const completionLogsQuery = useScheduleCompletionLogsQuery({
    enabled: isReady,
    itemId,
    userId,
  });
  const item = itemQuery.data ?? null;
  const completionLogs = completionLogsQuery.data ?? EMPTY_COMPLETION_LOGS;
  const { basisOccurrence, nextOccurrence, overdueOccurrences } =
    useMemo(() => {
      if (!item) {
        return {
          basisOccurrence: null,
          nextOccurrence: null,
          overdueOccurrences: [],
        };
      }

      const projection = createItemOccurrenceProjection({
        completionLogs,
        item,
        now,
        timezone,
      });
      const overdueOccurrences = projection.getOverdueOccurrences({
        lookbackStartLocalDate: item.startDateLocal,
        order: "scheduledAtDesc",
      });
      const nextOccurrence = projection.getNextOccurrence();
      const basisOccurrence = projection.getBasisOccurrence({
        fallbackOccurrence: overdueOccurrences[0] ?? nextOccurrence,
        scheduledAtUtc,
      });

      return {
        basisOccurrence,
        nextOccurrence,
        overdueOccurrences,
      };
    }, [completionLogs, item, now, scheduledAtUtc, timezone]);
  const refetch = async (): Promise<void> => {
    await Promise.all([itemQuery.refetch(), completionLogsQuery.refetch()]);
  };

  return {
    basisOccurrence,
    completionLogs,
    error: itemQuery.error ?? completionLogsQuery.error,
    isLoading:
      !isReady ||
      !userId ||
      itemQuery.isPending ||
      (Boolean(itemQuery.data) && completionLogsQuery.isPending),
    isReady,
    item,
    nextOccurrence,
    overdueOccurrences,
    refetch,
    timezone,
    userId,
  };
}
