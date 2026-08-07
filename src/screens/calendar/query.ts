import { useMemo } from "react";
import { endOfMonth, format, parse, startOfMonth } from "date-fns";

import { useScheduleRange } from "~/schedule/query";
import { createOccurrences, toUtcRange } from "~/schedule/rules/occurrence";

/** 선택 날짜가 속한 월의 occurrence를 조회한다. */
export function useCalendarQuery({
  now,
  selectedDate,
}: {
  now: Date;
  selectedDate: string;
}) {
  const month = parse(selectedDate, "yyyy-MM-dd", new Date());
  const startLocalDate = format(startOfMonth(month), "yyyy-MM-dd");
  const endLocalDate = format(endOfMonth(month), "yyyy-MM-dd");

  const query = useScheduleRange({ endLocalDate, startLocalDate });

  const occurrenceEntries = useMemo(() => {
    if (query.isLoading) {
      return [];
    }

    const occurrences = createOccurrences({
      logs: query.logs,
      now,
      schedules: query.items,
      timezone: query.timezone,
    });

    return occurrences.range({
      endUtc: toUtcRange(endLocalDate, query.timezone).endUtc,
      startUtc: toUtcRange(startLocalDate, query.timezone).startUtc,
    });
  }, [
    endLocalDate,
    now,
    query.items,
    query.isLoading,
    query.logs,
    query.timezone,
    startLocalDate,
  ]);

  return { ...query, occurrenceEntries };
}
