import { useMemo } from "react";

import { useScheduleDetail } from "~/schedule/query";
import {
  createOccurrences,
  type Occurrence,
  toUtcRange,
} from "~/schedule/rules/occurrence";

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
  const query = useScheduleDetail(itemId);
  const projection = useMemo(() => {
    if (!query.item) {
      return {
        basisOccurrence: null,
        nextOccurrence: null,
        overdueOccurrences: [],
      };
    }

    const occurrences = createOccurrences({
      logs: query.logs,
      now,
      schedules: [query.item],
      timezone: query.timezone,
    });
    const overdueOccurrences = occurrences
      .range(
        {
          endUtc: now.toISOString(),
          startUtc: toUtcRange(query.item.startDateLocal, query.timezone)
            .startUtc,
        },
        "overdue"
      )
      .map(({ occurrence }) => occurrence)
      .sort(compareDesc);

    return {
      basisOccurrence: scheduledAtUtc
        ? occurrences.find(query.item.id, scheduledAtUtc)
        : (overdueOccurrences[0] ?? occurrences.next(query.item.id)),
      nextOccurrence: occurrences.next(query.item.id),
      overdueOccurrences,
    };
  }, [now, query.item, query.logs, query.timezone, scheduledAtUtc]);

  return {
    ...query,
    ...projection,
    completionLogs: query.history,
  };
}

function compareDesc(left: Occurrence, right: Occurrence): number {
  return right.scheduledAtUtc.localeCompare(left.scheduledAtUtc);
}
