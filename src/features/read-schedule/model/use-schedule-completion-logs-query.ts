import { useQuery } from "@tanstack/react-query";

import type { CompletionLog } from "~/entities/schedule";
import {
  getCompletionLogAnchorBeforeRange,
  listCompletionLogs,
  listCompletionLogsForItem,
  listCompletionLogsForItemHistory,
  listCompletionLogsInRange,
} from "~/entities/schedule/api";

import { scheduleReadQueryKeys } from "./schedule-read-query-keys";

async function listCompletionLogsForProjection({
  anchorItemIds = [],
  itemIds,
  rangeEndUtc,
  rangeStartUtc,
  userId,
}: {
  anchorItemIds?: string[];
  itemIds: string[];
  rangeEndUtc?: string;
  rangeStartUtc?: string;
  userId: string;
}) {
  const rangeLogs =
    rangeStartUtc && rangeEndUtc
      ? await listCompletionLogsInRange({
          itemIds,
          rangeEndUtc,
          rangeStartUtc,
          userId,
        })
      : await listCompletionLogs({
          itemIds,
          userId,
        });

  if (!rangeStartUtc || anchorItemIds.length === 0) {
    return rangeLogs;
  }

  const anchors = await Promise.all(
    anchorItemIds.map((itemId) =>
      getCompletionLogAnchorBeforeRange({
        itemId,
        rangeStartUtc,
        userId,
      })
    )
  );

  return [
    ...rangeLogs,
    ...anchors.filter((log): log is CompletionLog => log !== null),
  ];
}

export function useScheduleCompletionLogsRangeQuery({
  anchorItemIds,
  enabled,
  itemIds,
  rangeEndUtc,
  rangeStartUtc,
  userId,
}: {
  anchorItemIds?: string[];
  enabled: boolean;
  itemIds: string[];
  rangeEndUtc?: string;
  rangeStartUtc?: string;
  userId: string | null;
}) {
  return useQuery({
    enabled: enabled && Boolean(userId) && itemIds.length > 0,
    queryFn: async () =>
      listCompletionLogsForProjection({
        anchorItemIds,
        itemIds,
        rangeEndUtc,
        rangeStartUtc,
        userId: userId!,
      }),
    queryKey: scheduleReadQueryKeys.completionLogs(
      userId ?? "anonymous",
      itemIds,
      anchorItemIds,
      rangeStartUtc,
      rangeEndUtc
    ),
  });
}

export function useScheduleCompletionLogsQuery({
  enabled,
  itemId,
  userId,
}: {
  enabled: boolean;
  itemId: string | null;
  userId: string | null;
}) {
  return useQuery({
    enabled: enabled && Boolean(userId) && Boolean(itemId),
    queryFn: async () =>
      listCompletionLogsForItemHistory({
        itemId: itemId!,
        userId: userId!,
      }),
    queryKey: scheduleReadQueryKeys.completionLogsForItem(
      userId ?? "anonymous",
      itemId ?? "unknown"
    ),
  });
}

export function useScheduleCompletionLogsForItemProjectionQuery({
  enabled,
  itemId,
  userId,
}: {
  enabled: boolean;
  itemId: string | null;
  userId: string | null;
}) {
  return useQuery({
    enabled: enabled && Boolean(userId) && Boolean(itemId),
    queryFn: async () =>
      listCompletionLogsForItem({
        itemId: itemId!,
        userId: userId!,
      }),
    queryKey: scheduleReadQueryKeys.completionLogsForItemProjection(
      userId ?? "anonymous",
      itemId ?? "unknown"
    ),
  });
}
