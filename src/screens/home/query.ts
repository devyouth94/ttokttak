import { useMemo } from "react";
import { addDays, format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { useScheduleRange } from "~/schedule/query";
import {
  createOccurrences,
  type OccurrenceEntry,
  toUtcRange,
} from "~/schedule/rules/occurrence";
import { useSession } from "~/session/provider";

const overdueLookbackDays = 730;
const upcomingDays = 14;

function addLocalDays(localDate: string, amount: number): string {
  return format(
    addDays(parse(localDate, "yyyy-MM-dd", new Date()), amount),
    "yyyy-MM-dd"
  );
}

function latestBySchedule(entries: OccurrenceEntry[]): OccurrenceEntry[] {
  const latest = new Map<string, OccurrenceEntry>();

  for (const entry of entries) {
    const previous = latest.get(entry.schedule.id);

    if (
      !previous ||
      entry.occurrence.scheduledAtUtc > previous.occurrence.scheduledAtUtc
    ) {
      latest.set(entry.schedule.id, entry);
    }
  }

  return [...latest.values()];
}

/** 홈에 표시할 지난 일정, 선택 날짜와 다가오는 일정을 조회한다. */
export function useHomeQuery({
  now,
  selectedDateId,
}: {
  now: Date;
  selectedDateId: string;
}) {
  const { profile } = useSession();
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const isToday = selectedDateId === today;
  const overdueStart = addLocalDays(today, -overdueLookbackDays);
  const upcomingStart = addLocalDays(today, 1);
  const upcomingEnd = addLocalDays(today, upcomingDays);
  const query = useScheduleRange({
    endLocalDate: isToday ? upcomingEnd : selectedDateId,
    startLocalDate: isToday ? overdueStart : selectedDateId,
  });
  const entries = useMemo(() => {
    const occurrences = createOccurrences({
      logs: query.logs,
      now,
      schedules: query.items,
      timezone: query.timezone,
    });

    return {
      overdueEntries: latestBySchedule(
        occurrences.range(
          {
            endUtc: now.toISOString(),
            startUtc: toUtcRange(overdueStart, query.timezone).startUtc,
          },
          "overdue"
        )
      ),
      selectedDateEntries: occurrences.range(
        toUtcRange(selectedDateId, query.timezone),
        "scheduled"
      ),
      upcomingEntries: isToday
        ? occurrences.range(
            {
              endUtc: toUtcRange(upcomingEnd, query.timezone).endUtc,
              startUtc: toUtcRange(upcomingStart, query.timezone).startUtc,
            },
            "scheduled"
          )
        : [],
    };
  }, [
    isToday,
    now,
    overdueStart,
    query.items,
    query.logs,
    query.timezone,
    selectedDateId,
    upcomingEnd,
    upcomingStart,
  ]);

  return { ...query, ...entries, completionLogs: query.logs };
}
