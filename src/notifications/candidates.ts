import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

import type { CompletionLog, RecurringItem } from "~/entities/schedule";
import {
  completionBasedRecurrenceTypes,
  formatUtcTimeInTimezone,
  getCurrentScheduleVersion,
  getNextOccurrence,
  getOccurrencesInRange,
} from "~/entities/schedule";
import type { AppLanguage } from "~/shared/i18n";

export type Candidate = {
  body: string;
  itemId: string;
  scheduledAtUtc: string;
  title: string;
};

/** 보관·알림 설정·복호화 상태를 확인해 예약 가능한 일정만 남긴다. */
function canSchedule(item: RecurringItem): boolean {
  return (
    !item.isArchived &&
    getCurrentScheduleVersion(item).notificationsEnabled &&
    item.contentStatus?.status !== "unrecoverable"
  );
}

/** 미처리 occurrence가 남아 다음 알림을 만들 수 없는 완료일 기준 일정인지 확인한다. */
function hasUnresolvedOccurrence(
  item: RecurringItem,
  completionLogs: CompletionLog[],
  nowUtc: string,
  timezone: string
): boolean {
  const schedule = getCurrentScheduleVersion(item);

  if (
    schedule.anchorType !== "completion_based" ||
    !completionBasedRecurrenceTypes.includes(
      schedule.recurrenceType as (typeof completionBasedRecurrenceTypes)[number]
    )
  ) {
    return false;
  }

  const historyStartUtc = fromZonedTime(
    `${item.startDateLocal}T00:00:00.000`,
    timezone
  ).toISOString();

  return getOccurrencesInRange(
    item,
    historyStartUtc,
    nowUtc,
    timezone,
    completionLogs,
    nowUtc
  ).some(
    (occurrence) =>
      occurrence.scheduledAtUtc < nowUtc &&
      (occurrence.status === "scheduled" || occurrence.status === "overdue")
  );
}

/** 한 일정에서 30일 범위와 그 이후 첫 occurrence의 알림 후보를 만든다. */
function getItemCandidates(params: {
  completionLogs: CompletionLog[];
  item: RecurringItem;
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

  const occurrences = getOccurrencesInRange(
    item,
    rangeStartUtc,
    rangeEndUtc,
    timezone,
    completionLogs,
    rangeStartUtc
  ).filter((occurrence) => occurrence.status === "scheduled");
  const nextOccurrence = getNextOccurrence(
    item,
    rangeStartUtc,
    timezone,
    completionLogs
  );
  const candidates = nextOccurrence
    ? [...occurrences, nextOccurrence]
    : occurrences;

  return Array.from(
    new Map(
      candidates.map((occurrence) => {
        const candidate: Candidate = {
          body: formatUtcTimeInTimezone(
            occurrence.scheduledAtUtc,
            timezone,
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
  completionLogs: CompletionLog[];
  items: RecurringItem[];
  language: AppLanguage;
  now: Date;
  timezone: string;
}): Candidate[] {
  const { completionLogs, items, language, now, timezone } = params;
  const logsByItem = new Map<string, CompletionLog[]>();

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
