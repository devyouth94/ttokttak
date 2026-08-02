import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

import type { AppLanguage } from "~/i18n/language";
import { formatTimestamp } from "~/schedule/display/date";
import type { OccurrenceLog } from "~/schedule/rules/occurrence";
import { createOccurrences } from "~/schedule/rules/occurrence";
import { supportsCompletion } from "~/schedule/rules/recurrence";
import type { Schedule } from "~/schedule/schedule";
import { currentRule } from "~/schedule/schedule";

export type Candidate = {
  body: string;
  itemId: string;
  scheduledAtUtc: string;
  title: string;
};

/** 보관·알림 설정·복호화 상태를 확인해 예약 가능한 일정만 남긴다. */
function canSchedule(item: Schedule): boolean {
  return (
    !item.isArchived &&
    currentRule(item).notificationsEnabled &&
    item.contentStatus !== "unrecoverable"
  );
}

/** 미처리 occurrence가 남아 다음 알림을 만들 수 없는 완료일 기준 일정인지 확인한다. */
function hasUnresolvedOccurrence(
  item: Schedule,
  completionLogs: OccurrenceLog[],
  nowUtc: string,
  timezone: string
): boolean {
  const schedule = currentRule(item);

  if (
    schedule.anchorType !== "completion_based" ||
    !supportsCompletion(schedule.recurrenceType)
  ) {
    return false;
  }

  const historyStartUtc = fromZonedTime(
    `${item.startDateLocal}T00:00:00.000`,
    timezone
  ).toISOString();

  return createOccurrences({
    logs: completionLogs,
    now: new Date(nowUtc),
    schedules: [item],
    timezone,
  })
    .range({ endUtc: nowUtc, startUtc: historyStartUtc })
    .some(
      (occurrence) =>
        occurrence.occurrence.scheduledAtUtc < nowUtc &&
        (occurrence.occurrence.status === "scheduled" ||
          occurrence.occurrence.status === "overdue")
    );
}

/** 한 일정에서 30일 범위와 그 이후 첫 occurrence의 알림 후보를 만든다. */
function getItemCandidates(params: {
  completionLogs: OccurrenceLog[];
  item: Schedule;
  language: AppLanguage;
  rangeEndUtc: string;
  rangeStartUtc: string;
  timezone: string;
}): Candidate[] {
  const {
    completionLogs,
    item,
    language,
    rangeEndUtc,
    rangeStartUtc,
    timezone,
  } = params;

  if (
    !canSchedule(item) ||
    hasUnresolvedOccurrence(item, completionLogs, rangeStartUtc, timezone)
  ) {
    return [];
  }

  const projection = createOccurrences({
    logs: completionLogs,
    now: new Date(rangeStartUtc),
    schedules: [item],
    timezone,
  });
  const occurrences = projection
    .range({ endUtc: rangeEndUtc, startUtc: rangeStartUtc }, "scheduled")
    .map(({ occurrence }) => occurrence);
  const nextOccurrence = projection.next(item.id);
  const candidates = nextOccurrence
    ? [...occurrences, nextOccurrence]
    : occurrences;

  return Array.from(
    new Map(
      candidates.map((occurrence) => {
        const candidate: Candidate = {
          body: formatTimestamp(
            occurrence.scheduledAtUtc,
            timezone,
            "time",
            language
          ),
          itemId: item.id,
          scheduledAtUtc: occurrence.scheduledAtUtc,
          title: item.title,
        };

        return [candidate.scheduledAtUtc, candidate];
      })
    ).values()
  );
}

/** 완료 기록을 일정별로 묶고 모든 일정의 알림 후보를 만든다. */
export function getCandidates(params: {
  completionLogs: OccurrenceLog[];
  items: Schedule[];
  language: AppLanguage;
  now: Date;
  timezone: string;
}): Candidate[] {
  const { completionLogs, items, language, now, timezone } = params;
  const logsByItem = new Map<string, OccurrenceLog[]>();

  for (const log of completionLogs) {
    const logs = logsByItem.get(log.itemId) ?? [];
    logs.push(log);
    logsByItem.set(log.itemId, logs);
  }

  const rangeStartUtc = now.toISOString();
  const rangeEndUtc = addDays(now, 30).toISOString();

  return items.flatMap((item) =>
    getItemCandidates({
      completionLogs: logsByItem.get(item.id) ?? [],
      item,
      language,
      rangeEndUtc,
      rangeStartUtc,
      timezone,
    })
  );
}
