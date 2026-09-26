import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { endOfMonth } from "date-fns/endOfMonth";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import { startOfMonth } from "date-fns/startOfMonth";
import { formatInTimeZone } from "date-fns-tz";

import { toUtcRange } from "~/schedule/local-date";
import { useNow } from "~/schedule/now";
import { useSchedules } from "~/schedule/query";
import { createOccurrences } from "~/schedule/rules/occurrence";

import { syncSelectedDateToTimezone } from "./calendar";

/** 캘린더의 선택 날짜, 시간대 보정과 월별 occurrence를 제공한다. */
export function useCalendarScreen() {
  const { t } = useTranslation();
  const now = useNow();
  const query = useSchedules();
  const [selectedDate, setSelectedDate] = useState(() =>
    formatInTimeZone(now, query.timezone, "yyyy-MM-dd")
  );
  const previousTimezoneRef = useRef(query.timezone);

  const month = parse(selectedDate, "yyyy-MM-dd", new Date());
  const startLocalDate = format(startOfMonth(month), "yyyy-MM-dd");
  const endLocalDate = format(endOfMonth(month), "yyyy-MM-dd");
  const today = formatInTimeZone(now, query.timezone, "yyyy-MM-dd");

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

  useEffect(() => {
    const previousTimezone = previousTimezoneRef.current;

    if (previousTimezone === query.timezone) {
      return;
    }

    previousTimezoneRef.current = query.timezone;
    setSelectedDate((previousDate) =>
      syncSelectedDateToTimezone({
        now,
        previousDate,
        previousTimezone,
        timezone: query.timezone,
      })
    );
  }, [now, query.timezone]);

  return {
    errorMessage: query.error ? t("error.tryAgain") : null,
    isLoading: query.isLoading,
    occurrenceEntries,
    retry: query.refetch,
    selectDate: setSelectedDate,
    selectedDate,
    timezone: query.timezone,
    today,
  };
}
