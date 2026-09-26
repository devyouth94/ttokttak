import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryClient } from "~/query-client";
import { useSession } from "~/session/provider";

import { getItem, listItems } from "./db/items";
import { listLogs } from "./db/logs";
import type { OccurrenceLog } from "./rules/occurrence";
import type { Schedule } from "./schedule";

const emptyItems: Schedule[] = [];
const emptyLogs: OccurrenceLog[] = [];
const rootKey = ["schedule"] as const;

/** 활성 일정과 전체 처리 기록을 화면 사이에서 공유한다. */
export function useSchedules() {
  const { profile, status: sessionStatus, user } = useSession();

  const isReady = sessionStatus === "ready";
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userId = user?.id ?? null;
  const enabled = isReady && Boolean(userId);

  const {
    data: items = emptyItems,
    error: itemsError,
    isPending: isItemsPending,
    refetch: refetchItems,
  } = useItemsQuery({ enabled, userId });

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const {
    data: logs = emptyLogs,
    error: logsError,
    isPending: isLogsPending,
    refetch: refetchLogs,
  } = useLogsQuery({ enabled, itemIds, userId });

  const isLoading =
    sessionStatus === "loading" ||
    (enabled && (isItemsPending || (itemIds.length > 0 && isLogsPending)));
  const error = itemsError ?? logsError;

  const refetch = useCallback(async (): Promise<void> => {
    await refetchItems();

    if (itemIds.length > 0) {
      await refetchLogs();
    }
  }, [itemIds.length, refetchItems, refetchLogs]);

  return {
    error,
    isLoading,
    isReady,
    items: isLoading || error ? emptyItems : items,
    logs,
    refetch,
    timezone,
    userId,
  };
}

/** 지정한 일정 하나를 조회한다. */
export function useScheduleById(itemId: string | null) {
  const { status: sessionStatus, user } = useSession();
  const userId = user?.id ?? null;

  return useQuery({
    enabled: sessionStatus === "ready" && Boolean(userId) && Boolean(itemId),
    queryFn: () => getItem({ id: itemId!, userId: userId! }),
    queryKey: [...userKey(userId ?? "signed-out"), "item", itemId],
  });
}

/** 활성 일정 조회를 무효화하고 현재 화면의 데이터를 다시 읽는다. */
export async function refreshSchedules(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: rootKey });
}

function userKey(userId: string): readonly string[] {
  return [...rootKey, userId];
}

function useItemsQuery({
  enabled,
  userId,
}: {
  enabled: boolean;
  userId: string | null;
}) {
  return useQuery({
    enabled,
    queryFn: () => listItems({ userId: userId! }),
    queryKey: [...userKey(userId ?? "signed-out"), "items"],
  });
}

function useLogsQuery({
  enabled,
  itemIds,
  userId,
}: {
  enabled: boolean;
  itemIds: string[];
  userId: string | null;
}) {
  return useQuery({
    enabled: enabled && itemIds.length > 0,
    queryFn: () => listLogs({ itemIds, userId: userId! }),
    queryKey: [...userKey(userId ?? "signed-out"), "logs", [...itemIds].sort()],
  });
}
