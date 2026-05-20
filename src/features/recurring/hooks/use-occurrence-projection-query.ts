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
  ReminderListOccurrenceProjectionPurpose,
  ReminderListOccurrenceProjectionRequirement,
} from "~/entities/schedule";
import { getOccurrenceProjectionRequirement } from "~/entities/schedule";

import { useCompletionLogsQuery } from "./use-completion-logs-query";
import {
  type RecurringFeedContext,
  useRecurringFeedContext,
} from "./use-recurring-feed-context";
import { useRecurringItemsQuery } from "./use-recurring-items-query";

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
  context?: RecurringFeedContext;
  purpose: HomeFeedOccurrenceProjectionPurpose;
}): UseOccurrenceProjectionQueryResult<HomeFeedOccurrenceProjectionRequirement>;
export function useOccurrenceProjectionQuery({
  context,
  purpose,
}: {
  context?: RecurringFeedContext;
  purpose: ReminderListOccurrenceProjectionPurpose;
}): UseOccurrenceProjectionQueryResult<ReminderListOccurrenceProjectionRequirement>;
export function useOccurrenceProjectionQuery({
  context,
  purpose,
}: {
  context?: RecurringFeedContext;
  purpose: CalendarMonthOccurrenceProjectionPurpose;
}): UseOccurrenceProjectionQueryResult<CalendarMonthOccurrenceProjectionRequirement>;
export function useOccurrenceProjectionQuery({
  context,
  purpose,
}: {
  context?: RecurringFeedContext;
  purpose: OccurrenceProjectionPurpose;
}): UseOccurrenceProjectionQueryResult<OccurrenceProjectionRequirement> {
  const fallbackContext = useRecurringFeedContext();
  const { isReady, timezone, userId } = context ?? fallbackContext;
  const itemsQuery = useRecurringItemsQuery({
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
  const completionLogsQuery = useCompletionLogsQuery({
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
