import { useQuery } from "@tanstack/react-query";

import type { CompletionLog } from "~/entities/schedule";
import {
  getCompletionLogAnchorBeforeRange,
  listCompletionLogs,
  listCompletionLogsForItemHistory,
  listCompletionLogsInRange,
} from "~/entities/schedule/api";

import { recurringQueryKeys } from "./recurring-query-keys";

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

export function useCompletionLogsQuery({
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
    queryKey: recurringQueryKeys.completionLogs(
      userId ?? "anonymous",
      itemIds,
      anchorItemIds,
      rangeStartUtc,
      rangeEndUtc
    ),
  });
}

export function useCompletionLogsForItemQuery({
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
    queryKey: recurringQueryKeys.completionLogsForItem(
      userId ?? "anonymous",
      itemId ?? "unknown"
    ),
  });
}
