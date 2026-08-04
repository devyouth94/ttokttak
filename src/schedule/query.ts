import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryClient } from "~/query-client";
import { useSession } from "~/session/provider";

import { getItem, listItems } from "./db/items";
import {
  getAnchor,
  listHistory,
  listItemLogs,
  listLogsInRange,
} from "./db/logs";
import { type OccurrenceLog, toUtcRange } from "./rules/occurrence";
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

  const itemsQuery = useQuery({
    enabled,
    queryFn: () => listItems({ userId: userId! }),
    queryKey: [...userKey(userId ?? "signed-out"), "items"],
  });

  const items = itemsQuery.data ?? emptyItems;
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const anchorItemIds = useMemo(() => getAnchorItemIds(items), [items]);

  const logsQuery = useQuery({
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

  const refetchItems = itemsQuery.refetch;
  const refetchLogs = logsQuery.refetch;

  const refetch = useCallback(async (): Promise<void> => {
    await refetchItems();

    if (itemIds.length > 0) {
      await refetchLogs();
    }
  }, [itemIds.length, refetchItems, refetchLogs]);

  return {
    error: itemsQuery.error ?? logsQuery.error,
    isLoading:
      sessionStatus === "loading" ||
      (enabled &&
        (itemsQuery.isPending || (itemIds.length > 0 && logsQuery.isPending))),
    isReady,
    items,
    logs: logsQuery.data ?? emptyLogs,
    refetch,
    timezone,
    userId,
  };
}

/** 지정한 일정 하나를 조회한다. */
export function useScheduleById(itemId: string | null) {
  const { profile, status: sessionStatus, user } = useSession();

  const isReady = sessionStatus === "ready";
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userId = user?.id ?? null;
  const enabled = isReady && Boolean(userId) && Boolean(itemId);

  const itemQuery = useQuery({
    enabled,
    queryFn: () => getItem({ id: itemId!, userId: userId! }),
    queryKey: [...userKey(userId ?? "signed-out"), "item", itemId],
  });

  return {
    error: itemQuery.error,
    isLoading:
      Boolean(itemId) &&
      (sessionStatus === "loading" || (enabled && itemQuery.isPending)),
    isReady,
    item: itemQuery.data ?? null,
    refetch: itemQuery.refetch,
    timezone,
    userId,
  };
}

/** 상세 화면에 필요한 일정, 최근 기록과 전체 계산 기록을 조회한다. */
export function useScheduleDetail(itemId: string | null) {
  const scheduleQuery = useScheduleById(itemId);
  const { isReady, item, timezone, userId } = scheduleQuery;

  const detailQuery = useQuery({
    enabled: isReady && Boolean(userId) && Boolean(itemId) && Boolean(item),
    queryFn: async () => {
      const [history, logs] = await Promise.all([
        listHistory({ itemId: itemId!, userId: userId! }),
        listItemLogs({ itemId: itemId!, userId: userId! }),
      ]);

      return { history, logs };
    },
    queryKey: [...userKey(userId ?? "signed-out"), "detail", itemId],
  });

  const refetchSchedule = scheduleQuery.refetch;
  const refetchDetail = detailQuery.refetch;

  const refetch = useCallback(async (): Promise<void> => {
    if (!item) {
      await refetchSchedule();
      return;
    }

    await Promise.all([refetchSchedule(), refetchDetail()]);
  }, [item, refetchDetail, refetchSchedule]);

  return {
    error: scheduleQuery.error ?? detailQuery.error,
    history: detailQuery.data?.history ?? emptyLogs,
    isLoading:
      scheduleQuery.isLoading || (Boolean(item) && detailQuery.isPending),
    item,
    logs: detailQuery.data?.logs ?? emptyLogs,
    refetch,
    timezone,
    userId,
  };
}

/** 활성 일정 조회를 무효화하고 현재 화면의 데이터를 다시 읽는다. */
export async function refreshSchedules(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: rootKey });
}
