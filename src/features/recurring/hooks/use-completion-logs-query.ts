import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import type { CompletionLog } from "~/features/recurring/domain/types";
import {
  listCompletionLogs,
  listCompletionLogsForItem,
  listCompletionLogsPage,
} from "~/features/recurring/repositories/completion-logs-repository";

import { recurringQueryKeys } from "./recurring-query-keys";

export const HISTORY_PAGE_SIZE = 20;

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

export function useInfiniteCompletionLogsQuery({
  enabled,
  itemIds,
  pageSize = HISTORY_PAGE_SIZE,
  userId,
}: {
  enabled: boolean;
  itemIds: string[];
  pageSize?: number;
  userId: string | null;
}) {
  return useInfiniteQuery({
    enabled: enabled && Boolean(userId) && itemIds.length > 0,
    getNextPageParam: (
      lastPage: CompletionLog[],
      allPages: CompletionLog[][]
    ) => {
      if (lastPage.length < pageSize) {
        return undefined;
      }

      return allPages.flat().length;
    },
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<CompletionLog[]> =>
      listCompletionLogsPage({
        itemIds,
        pageOffset: pageParam,
        pageSize,
        userId: userId!,
      }),
    queryKey: recurringQueryKeys.completionLogsInfinite(
      userId ?? "anonymous",
      itemIds
    ),
  });
}
