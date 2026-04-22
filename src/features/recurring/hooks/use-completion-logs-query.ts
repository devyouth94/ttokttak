import { useQuery } from "@tanstack/react-query";

import {
  listCompletionLogs,
  listCompletionLogsForItem,
} from "~/features/recurring/repositories/completion-logs-repository";

import { recurringQueryKeys } from "./recurring-query-keys";

export function useCompletionLogsQuery({
  enabled,
  itemIds,
  userId,
}: {
  enabled: boolean;
  itemIds: string[];
  userId: string | null;
}) {
  return useQuery({
    enabled: enabled && Boolean(userId) && itemIds.length > 0,
    queryFn: async () =>
      listCompletionLogs({
        itemIds,
        userId: userId!,
      }),
    queryKey: recurringQueryKeys.completionLogs(userId ?? "anonymous", itemIds),
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
      listCompletionLogsForItem({
        itemId: itemId!,
        userId: userId!,
      }),
    queryKey: recurringQueryKeys.completionLogsForItem(
      userId ?? "anonymous",
      itemId ?? "unknown"
    ),
  });
}
