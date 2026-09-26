import { toUtcRange } from "~/schedule/local-date";
import type { Occurrence, OccurrenceLog, Schedule } from "~/schedule/model";
import { useScheduleDetailData } from "~/schedule/query";
import { createOccurrences } from "~/schedule/rules/occurrence";

export type DetailQueryResult =
  | { status: "loading" }
  | { status: "notFound" }
  | {
      error: unknown | null;
      refetch: () => Promise<void>;
      status: "error";
    }
  | {
      basisOccurrence: Occurrence | null;
      history: OccurrenceLog[];
      item: Schedule;
      overdueCount: number;
      status: "ready";
      timezone: string;
    };

/** 상세 화면의 대표 occurrence와 지난 occurrence를 계산한다. */
export function useDetailQuery({
  itemId,
  now,
  scheduledAtUtc,
}: {
  itemId: string | null;
  now: Date;
  scheduledAtUtc?: string;
}): DetailQueryResult {
  const data = useScheduleDetailData(itemId);

  if (data.status !== "ready") {
    return data;
  }

  const { item, logs, timezone } = data;

  const history = [...logs]
    .sort((left, right) => right.actedAtUtc.localeCompare(left.actedAtUtc))
    .slice(0, 5);
  let basisOccurrence: Occurrence | null = null;
  let overdueCount = 0;

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

  return {
    basisOccurrence,
    history,
    item,
    overdueCount,
    status: "ready",
    timezone,
  };
}
