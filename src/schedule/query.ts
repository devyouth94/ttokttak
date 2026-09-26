import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

import { useSession } from "~/session/provider";

import {
  activeScheduleDataKey,
  scheduleDetailKey,
  scheduleItemKey,
} from "./cache";
import { getItem } from "./db/items";
import { listItemLogs } from "./db/logs";
import { ScheduleNotFoundError } from "./errors";
import type { OccurrenceLog, Schedule } from "./model";
import { readActiveScheduleData } from "./read";

const emptyItems: Schedule[] = [];
const emptyLogs: OccurrenceLog[] = [];

export type ScheduleDetailDataResult =
  | { status: "loading" }
  | { status: "notFound" }
  | {
      error: unknown | null;
      refetch: () => Promise<void>;
      status: "error";
    }
  | {
      item: Schedule;
      logs: OccurrenceLog[];
      refetch: () => Promise<void>;
      status: "ready";
      timezone: string;
    };

/** 활성 일정과 해당 일정의 전체 처리 기록을 하나의 조회로 공유한다. */
export function useSchedules() {
  const { profile, status: sessionStatus, user } = useSession();
  const isSessionReady = sessionStatus === "ready";
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userId = user?.id ?? null;
  const enabled = isSessionReady && Boolean(userId);
  const {
    data,
    error,
    isPending,
    refetch: refetchData,
  } = useQuery({
    enabled,
    queryFn: () => readActiveScheduleData({ userId: userId! }),
    queryKey: activeScheduleDataKey(userId ?? "signed-out"),
  });
  const isLoading = sessionStatus === "loading" || (enabled && isPending);
  const refetch = useCallback(async (): Promise<void> => {
    await refetchData();
  }, [refetchData]);

  return {
    error,
    isLoading,
    isReady: isSessionReady,
    items: isLoading || error ? emptyItems : (data?.schedules ?? emptyItems),
    logs: data?.logs ?? emptyLogs,
    refetch,
    timezone,
    userId,
  };
}

/** 지정한 일정 하나를 처리 기록 없이 조회한다. */
export function useScheduleById(itemId: string | null) {
  const { status: sessionStatus, user } = useSession();
  const userId = user?.id ?? null;

  return useQuery({
    enabled: sessionStatus === "ready" && Boolean(userId) && Boolean(itemId),
    queryFn: () => getItem({ id: itemId!, userId: userId! }),
    queryKey: scheduleItemKey(userId ?? "signed-out", itemId),
  });
}

/** 상세 계산에 필요한 일정 하나와 전체 처리 기록을 준비한다. */
export function useScheduleDetailData(
  itemId: string | null
): ScheduleDetailDataResult {
  const { profile, status: sessionStatus, user } = useSession();
  const isSessionReady = sessionStatus === "ready";
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userId = user?.id ?? null;
  const {
    data: item,
    error: itemError,
    isPending: isItemPending,
    refetch: refetchItem,
  } = useScheduleById(itemId);
  const {
    data: logs,
    error: logsError,
    isPending: isLogsPending,
    refetch: refetchLogs,
  } = useQuery({
    enabled:
      isSessionReady && Boolean(userId) && Boolean(itemId) && Boolean(item),
    queryFn: () => listItemLogs({ itemId: itemId!, userId: userId! }),
    queryKey: scheduleDetailKey(userId ?? "signed-out", itemId),
  });
  const refetch = useCallback(async (): Promise<void> => {
    if (!item) {
      await refetchItem();
      return;
    }

    await Promise.all([refetchItem(), refetchLogs()]);
  }, [item, refetchItem, refetchLogs]);

  if (itemId && sessionStatus === "loading") {
    return { status: "loading" };
  }

  if (!itemId || !isSessionReady || !userId) {
    return {
      error: itemError ?? logsError,
      refetch,
      status: "error",
    };
  }

  if (isItemPending || (item && isLogsPending)) {
    return { status: "loading" };
  }

  if (itemError instanceof ScheduleNotFoundError) {
    return { status: "notFound" };
  }

  const detailError = itemError ?? logsError;

  if (detailError || !item) {
    return { error: detailError, refetch, status: "error" };
  }

  return {
    item,
    logs: logs ?? emptyLogs,
    refetch,
    status: "ready",
    timezone,
  };
}
