import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

import { listItemLogs } from "~/schedule/db/logs";
import { useScheduleById } from "~/schedule/query";
import {
  createOccurrences,
  type Occurrence,
  type OccurrenceLog,
  toUtcRange,
} from "~/schedule/rules/occurrence";
import { useSession } from "~/session/provider";

const emptyLogs: OccurrenceLog[] = [];

/** 상세 화면의 대표 occurrence와 지난 occurrence를 계산한다. */
export function useDetailQuery({
  itemId,
  now,
  scheduledAtUtc,
}: {
  itemId: string | null;
  now: Date;
  scheduledAtUtc?: string;
}) {
  const { profile, status: sessionStatus, user } = useSession();
  const isReady = sessionStatus === "ready";
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userId = user?.id ?? null;

  const {
    data: item = null,
    error: itemError,
    isPending: isItemPending,
    refetch: refetchItem,
  } = useScheduleById(itemId);

  const {
    data: logs = emptyLogs,
    error: logsError,
    isPending: isLogsPending,
    refetch: refetchLogs,
  } = useDetailLogsQuery({
    enabled: isReady && Boolean(userId) && Boolean(itemId) && Boolean(item),
    itemId,
    userId,
  });

  const refetch = useCallback(async (): Promise<void> => {
    if (!item) {
      await refetchItem();
      return;
    }

    await Promise.all([refetchItem(), refetchLogs()]);
  }, [item, refetchItem, refetchLogs]);

  const isLoading =
    (Boolean(itemId) &&
      (sessionStatus === "loading" ||
        (isReady && Boolean(userId) && isItemPending))) ||
    (Boolean(item) && isLogsPending);
  const history = [...logs]
    .sort((left, right) => right.actedAtUtc.localeCompare(left.actedAtUtc))
    .slice(0, 5);
  let basisOccurrence: Occurrence | null = null;
  let overdueCount = 0;

  if (item) {
    const occurrences = createOccurrences({
      logs,
      now,
      schedules: [item],
      timezone,
    });
    const overdueEntries = occurrences.range(
      {
        endUtc: now.toISOString(),
        startUtc: toUtcRange(item.startDateLocal, timezone).startUtc,
      },
      "overdue"
    );
    const nextOccurrence = occurrences.next(item.id);
    const entryOccurrence = scheduledAtUtc
      ? occurrences.find(item.id, scheduledAtUtc)
      : null;

    basisOccurrence =
      entryOccurrence ?? overdueEntries.at(-1)?.occurrence ?? nextOccurrence;
    overdueCount = overdueEntries.length;
  }

  return {
    basisOccurrence,
    error: itemError ?? logsError,
    history,
    isLoading,
    item,
    logs,
    overdueCount,
    refetch,
    timezone,
    userId,
  };
}

function useDetailLogsQuery({
  enabled,
  itemId,
  userId,
}: {
  enabled: boolean;
  itemId: string | null;
  userId: string | null;
}) {
  return useQuery({
    enabled,
    queryFn: () => listItemLogs({ itemId: itemId!, userId: userId! }),
    queryKey: ["schedule", userId ?? "signed-out", "detail", itemId],
  });
}
