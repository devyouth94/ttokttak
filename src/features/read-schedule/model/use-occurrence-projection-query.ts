import { useCallback, useMemo } from "react";

import type {
  CalendarMonthOccurrenceProjectionPurpose,
  CalendarMonthOccurrenceProjectionRequirement,
  CompletionLog,
  HomeFeedOccurrenceProjectionPurpose,
  HomeFeedOccurrenceProjectionRequirement,
  OccurrenceProjectionPurpose,
  OccurrenceProjectionRequirement,
  RecurringItem,
  ScheduleListOccurrenceProjectionPurpose,
  ScheduleListOccurrenceProjectionRequirement,
} from "~/entities/schedule";
import { getOccurrenceProjectionRequirement } from "~/entities/schedule";

import type { ScheduleReadContext } from "./schedule-read-context";
import { useScheduleCompletionLogsRangeQuery } from "./use-schedule-completion-logs-query";
import { useScheduleItemsQuery } from "./use-schedule-items-query";

const EMPTY_COMPLETION_LOGS: CompletionLog[] = [];
const EMPTY_ITEMS: RecurringItem[] = [];

type UseOccurrenceProjectionQueryResult<TRequirement> = {
  completionLogs: CompletionLog[];
  error: unknown;
  isLoading: boolean;
  isReady: boolean;
  isRefreshing: boolean;
  itemIds: string[];
  items: RecurringItem[];
  projectionRequirement: TRequirement;
  refetch: () => Promise<void>;
  timezone: string;
  userId: string | null;
};

export function useOccurrenceProjectionQuery({
  context,
  purpose,
}: {
  context: ScheduleReadContext;
  purpose: HomeFeedOccurrenceProjectionPurpose;
}): UseOccurrenceProjectionQueryResult<HomeFeedOccurrenceProjectionRequirement>;
export function useOccurrenceProjectionQuery({
  context,
  purpose,
}: {
  context: ScheduleReadContext;
  purpose: ScheduleListOccurrenceProjectionPurpose;
}): UseOccurrenceProjectionQueryResult<ScheduleListOccurrenceProjectionRequirement>;
export function useOccurrenceProjectionQuery({
  context,
  purpose,
}: {
  context: ScheduleReadContext;
  purpose: CalendarMonthOccurrenceProjectionPurpose;
}): UseOccurrenceProjectionQueryResult<CalendarMonthOccurrenceProjectionRequirement>;
export function useOccurrenceProjectionQuery({
  context,
  purpose,
}: {
  context: ScheduleReadContext;
  purpose: OccurrenceProjectionPurpose;
}): UseOccurrenceProjectionQueryResult<OccurrenceProjectionRequirement> {
  const { isReady, timezone, userId } = context;
  const itemsQuery = useScheduleItemsQuery({
    enabled: isReady,
    timezone,
    userId,
  });
  const items = itemsQuery.data ?? EMPTY_ITEMS;
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const projectionRequirement = useMemo(
    () =>
      getOccurrenceProjectionRequirement({
        items,
        purpose,
        timezone,
      }),
    [items, purpose, timezone]
  );
  const completionLogsQuery = useScheduleCompletionLogsRangeQuery({
    anchorItemIds: projectionRequirement.completionLogQuery.anchorItemIds,
    enabled: isReady,
    itemIds,
    rangeEndUtc: projectionRequirement.completionLogQuery.rangeEndUtc,
    rangeStartUtc: projectionRequirement.completionLogQuery.rangeStartUtc,
    userId,
  });
  const refetchItems = itemsQuery.refetch;
  const refetchCompletionLogs = completionLogsQuery.refetch;
  const refetch = useCallback(async (): Promise<void> => {
    if (itemIds.length === 0) {
      await refetchItems();
      return;
    }

    await Promise.all([refetchItems(), refetchCompletionLogs()]);
  }, [itemIds.length, refetchCompletionLogs, refetchItems]);

  return {
    completionLogs: completionLogsQuery.data ?? EMPTY_COMPLETION_LOGS,
    error: itemsQuery.error ?? completionLogsQuery.error,
    isLoading:
      !isReady ||
      itemsQuery.isPending ||
      (itemIds.length > 0 && completionLogsQuery.isPending),
    isReady,
    isRefreshing: itemsQuery.isRefetching || completionLogsQuery.isRefetching,
    itemIds,
    items,
    projectionRequirement,
    refetch,
    timezone,
    userId,
  };
}
