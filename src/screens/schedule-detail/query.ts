import { useScheduleDetail } from "~/schedule/query";
import { createOccurrences, toUtcRange } from "~/schedule/rules/occurrence";

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
  if (!query.item) {
    return {
      ...query,
      basisOccurrence: null,
      overdueCount: 0,
    };
  }

  const occurrences = createOccurrences({
    logs: query.logs,
    now,
    schedules: [query.item],
    timezone: query.timezone,
  });
  const overdueEntries = occurrences.range(
    {
      endUtc: now.toISOString(),
      startUtc: toUtcRange(query.item.startDateLocal, query.timezone).startUtc,
    },
    "overdue"
  );
  const nextOccurrence = occurrences.next(query.item.id);
  const entryOccurrence = scheduledAtUtc
    ? occurrences.find(query.item.id, scheduledAtUtc)
    : null;

  return {
    ...query,
    basisOccurrence:
      entryOccurrence ?? overdueEntries.at(-1)?.occurrence ?? nextOccurrence,
    overdueCount: overdueEntries.length,
  };
}
