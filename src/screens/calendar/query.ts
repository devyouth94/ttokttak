import { useMemo } from "react";
import { endOfMonth } from "date-fns/endOfMonth";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import { startOfMonth } from "date-fns/startOfMonth";

import { useSchedules } from "~/schedule/query";
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

  const query = useSchedules();

  const occurrenceEntries = useMemo(() => {
    if (query.isLoading || query.error) {
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
    query.error,
    query.isLoading,
    query.logs,
    query.timezone,
    startLocalDate,
  ]);

  return { ...query, occurrenceEntries };
}
