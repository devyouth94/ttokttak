import { useMemo } from "react";
import { endOfMonth, format, parse, startOfMonth } from "date-fns";

import { useScheduleRange } from "~/schedule/query";
import { createOccurrences, toUtcRange } from "~/schedule/rules/occurrence";

/** 캘린더의 보이는 월과 선택 날짜에 표시할 occurrence를 조회한다. */
export function useCalendarQuery({
  now,
  selectedDate,
  visibleMonth,
}: {
  now: Date;
  selectedDate: string;
  visibleMonth: string;
}) {
  const month = parse(`${visibleMonth}-01`, "yyyy-MM-dd", new Date());
  const startLocalDate = format(startOfMonth(month), "yyyy-MM-dd");
  const endLocalDate = format(endOfMonth(month), "yyyy-MM-dd");
  const query = useScheduleRange({ endLocalDate, startLocalDate });
  const entries = useMemo(() => {
    if (query.isLoading) {
      return { selectedDateEntries: [], visibleMonthEntries: [] };
    }

    const occurrences = createOccurrences({
      logs: query.logs,
      now,
      schedules: query.items,
      timezone: query.timezone,
    });

    return {
      selectedDateEntries: occurrences
        .range(toUtcRange(selectedDate, query.timezone))
        .filter((entry) => entry.occurrence.localDate === selectedDate),
      visibleMonthEntries: occurrences.range({
        endUtc: toUtcRange(endLocalDate, query.timezone).endUtc,
        startUtc: toUtcRange(startLocalDate, query.timezone).startUtc,
      }),
    };
  }, [
    endLocalDate,
    now,
    query.items,
    query.isLoading,
    query.logs,
    query.timezone,
    selectedDate,
    startLocalDate,
  ]);

  return { ...query, ...entries };
}
