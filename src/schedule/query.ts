import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryClient } from "~/query-client";
import { useSession } from "~/session/provider";

import { getItem, listItems } from "./db/items";
import { getAnchor, listLogsInRange } from "./db/logs";
import {
  type OccurrenceLog,
  toUtcRange,
  type UtcRange,
} from "./rules/occurrence";
import { supportsCompletion } from "./rules/recurrence";
import { currentRule, type Schedule } from "./schedule";

const emptyItems: Schedule[] = [];
const emptyLogs: OccurrenceLog[] = [];
const rootKey = ["schedule"] as const;

function userKey(userId: string): readonly string[] {
  return [...rootKey, userId];
}

function getAnchorItemIds(items: Schedule[]): string[] {
  return items
    .filter((item) => {
      const rule = currentRule(item);

      return (
        rule.anchorType === "completion_based" &&
        supportsCompletion(rule.recurrenceType)
      );
    })
    .map((item) => item.id);
}

/** 일정 전체와 지정한 local date 범위의 처리 기록을 조회한다. */
export function useScheduleRange({
  endLocalDate,
  startLocalDate,
}: {
  endLocalDate: string;
  startLocalDate: string;
}) {
  const { profile, status: sessionStatus, user } = useSession();

  const isReady = sessionStatus === "ready";
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userId = user?.id ?? null;
  const enabled = isReady && Boolean(userId);

  const range = useMemo(
    () => ({
      endUtc: toUtcRange(endLocalDate, timezone).endUtc,
      startUtc: toUtcRange(startLocalDate, timezone).startUtc,
    }),
    [endLocalDate, startLocalDate, timezone]
  );

  const {
    data: items = emptyItems,
    error: itemsError,
    isPending: isItemsPending,
    refetch: refetchItems,
  } = useItemsQuery({ enabled, userId });

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const anchorItemIds = useMemo(() => getAnchorItemIds(items), [items]);

  const {
    data: logs = emptyLogs,
    error: logsError,
    isPending: isLogsPending,
    refetch: refetchLogs,
  } = useRangeLogsQuery({ enabled, itemIds, anchorItemIds, range, userId });

  const refetch = useCallback(async (): Promise<void> => {
    await refetchItems();

    if (itemIds.length > 0) {
      await refetchLogs();
    }
  }, [itemIds.length, refetchItems, refetchLogs]);

  const isLoading =
    sessionStatus === "loading" ||
    (enabled && (isItemsPending || (itemIds.length > 0 && isLogsPending)));

  return {
    error: itemsError ?? logsError,
    isLoading,
    isReady,
    items,
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

function useRangeLogsQuery({
  enabled,
  itemIds,
  anchorItemIds,
  range,
  userId,
}: {
  enabled: boolean;
  itemIds: string[];
  anchorItemIds: string[];
  range: UtcRange;
  userId: string | null;
}) {
  return useQuery({
    enabled: enabled && itemIds.length > 0,
    queryFn: async () => {
      const logs = await listLogsInRange({
        itemIds,
        rangeEndUtc: range.endUtc,
        rangeStartUtc: range.startUtc,
        userId: userId!,
      });
      const anchors = await Promise.all(
        anchorItemIds.map((itemId) =>
          getAnchor({
            itemId,
            rangeStartUtc: range.startUtc,
            userId: userId!,
          })
        )
      );

      return [
        ...logs,
        ...anchors.filter((log): log is OccurrenceLog => log !== null),
      ];
    },
    queryKey: [
      ...userKey(userId ?? "signed-out"),
      "logs",
      [...itemIds].sort(),
      [...anchorItemIds].sort(),
      range.startUtc,
      range.endUtc,
    ],
  });
}
