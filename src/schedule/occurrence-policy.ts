import { formatInTimeZone } from "date-fns-tz";

import { addLocalDays, toUtcRange } from "./local-date";
import type {
  Occurrence,
  OccurrenceEntry,
  OccurrenceLog,
  Schedule,
} from "./model";
import { createOccurrences } from "./rules/occurrence";

export const OCCURRENCE_LOOKBACK_DAYS = 730;

type Occurrences = ReturnType<typeof createOccurrences>;

/** 지정한 날짜에 아직 처리하지 않은 occurrence를 고른다. */
export function selectScheduledOnDate({
  localDate,
  occurrences,
  timezone,
}: {
  localDate: string;
  occurrences: Occurrences;
  timezone: string;
}): OccurrenceEntry[] {
  return occurrences.range(toUtcRange(localDate, timezone), "scheduled");
}

/** 최근 730일의 지난 occurrence 중 일정별 최신 하나를 고른다. */
export function selectLatestOverdue({
  now,
  occurrences,
  timezone,
}: {
  now: Date;
  occurrences: Occurrences;
  timezone: string;
}): OccurrenceEntry[] {
  const today = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const entries = occurrences.range(
    {
      endUtc: now.toISOString(),
      startUtc: toUtcRange(
        addLocalDays(today, -OCCURRENCE_LOOKBACK_DAYS),
        timezone
      ).startUtc,
    },
    "overdue"
  );
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

/** 지난 occurrence를 처리할 때 함께 처리할 이전 미해결 occurrence를 고른다. */
export function selectOccurrencesToRecord({
  logs,
  now,
  target,
  timezone,
}: {
  logs: OccurrenceLog[];
  now: Date;
  target: OccurrenceEntry;
  timezone: string;
}): Occurrence[] {
  const candidates =
    target.occurrence.status === "overdue"
      ? createOccurrences({
          logs,
          now,
          schedules: [target.schedule],
          timezone,
        })
          .range(
            {
              endUtc: target.occurrence.scheduledAtUtc,
              startUtc: toUtcRange(target.schedule.startDateLocal, timezone)
                .startUtc,
            },
            "overdue"
          )
          .map(({ occurrence }) => occurrence)
      : [target.occurrence];
  const loggedTimes = new Set(
    logs
      .filter((log) => log.itemId === target.schedule.id)
      .map((log) => log.scheduledAtUtc)
  );

  return candidates.filter(
    (occurrence) => !loggedTimes.has(occurrence.scheduledAtUtc)
  );
}

/** 각 기준 시각의 최근 지난 일정 수와 오늘 도래한 occurrence 수를 센다. */
export function countPendingAtTimes({
  logs,
  schedules,
  times,
  timezone,
}: {
  logs: OccurrenceLog[];
  schedules: Schedule[];
  times: Date[];
  timezone: string;
}): Map<string, number> {
  const first = times[0];
  const last = times.at(-1);

  if (!first || !last) {
    return new Map();
  }

  const firstLocalDate = formatInTimeZone(first, timezone, "yyyy-MM-dd");
  const entries = createOccurrences({
    logs,
    now: last,
    schedules: schedules.filter((schedule) => !schedule.isArchived),
    timezone,
  })
    .range({
      startUtc: toUtcRange(
        addLocalDays(firstLocalDate, -OCCURRENCE_LOOKBACK_DAYS),
        timezone
      ).startUtc,
      endUtc: last.toISOString(),
    })
    .filter(
      ({ occurrence }) =>
        occurrence.status !== "completed" && occurrence.status !== "skipped"
    );

  // ponytail: 최대 61개 시각에서 선형 스캔한다. 대규모 일정에서 병목이 확인되면 날짜별 인덱스를 추가한다.
  return new Map(
    times.map((time) => {
      const nowUtc = time.toISOString();
      const today = formatInTimeZone(time, timezone, "yyyy-MM-dd");
      const start = addLocalDays(today, -OCCURRENCE_LOOKBACK_DAYS);
      const overdueSchedules = new Set<string>();
      let dueToday = 0;

      for (const { occurrence, schedule } of entries) {
        if (occurrence.localDate >= start && occurrence.localDate < today) {
          overdueSchedules.add(schedule.id);
        } else if (
          occurrence.localDate === today &&
          occurrence.scheduledAtUtc <= nowUtc
        ) {
          dueToday += 1;
        }
      }

      return [nowUtc, overdueSchedules.size + dueToday];
    })
  );
}
