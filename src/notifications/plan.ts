import type { NotificationRequest } from "expo-notifications";
import { addDays } from "date-fns/addDays";

import type { AppLanguage } from "~/i18n/language";
import { formatTimestamp } from "~/schedule/display/date";
import { toUtcRange } from "~/schedule/local-date";
import {
  currentRule,
  type OccurrenceLog,
  type Schedule,
} from "~/schedule/model";
import { countPendingAtTimes } from "~/schedule/occurrence-policy";
import { createOccurrences } from "~/schedule/rules/occurrence";
import { supportsCompletion } from "~/schedule/rules/recurrence";

export const REMINDER_PREFIX = "ttokttak:reminder:";
const MAX_NOTIFICATIONS = 60;

type PlanInput = {
  items: Schedule[];
  completionLogs: OccurrenceLog[];
  language: AppLanguage;
  now: Date;
  timezone: string;
  userId: string;
  requests: NotificationRequest[];
};

/** 일정과 현재 예약만으로 현재 배지·미래 배지·변경할 예약을 계산한다. */
export function planNotifications(input: PlanInput) {
  const { items, completionLogs, now, timezone, userId, requests } = input;
  const existing = requests.filter((request) =>
    request.identifier.startsWith(REMINDER_PREFIX)
  );
  const available = Math.max(
    0,
    MAX_NOTIFICATIONS - (requests.length - existing.length)
  );
  const candidates = getCandidates(input)
    .sort((left, right) =>
      left.scheduledAtUtc.localeCompare(right.scheduledAtUtc)
    )
    .slice(0, available);
  const badgeCounts = countPendingAtTimes({
    logs: completionLogs,
    schedules: items,
    times: [
      now,
      ...candidates.map(({ scheduledAtUtc }) => new Date(scheduledAtUtc)),
    ],
    timezone,
  });
  const wanted = candidates.map((candidate) => ({
    ...candidate,
    identifier: `${REMINDER_PREFIX}${userId}:${candidate.itemId}:${candidate.scheduledAtUtc}`,
    badgeCount: badgeCounts.get(candidate.scheduledAtUtc) ?? 0,
  }));
  const wantedById = new Map(
    wanted.map((reminder) => [reminder.identifier, reminder])
  );
  const matchingIds = new Set(
    existing
      .filter((request) => {
        const reminder = wantedById.get(request.identifier);
        return (
          reminder !== undefined &&
          request.content.badge === reminder.badgeCount &&
          request.content.body === reminder.body &&
          request.content.title === reminder.title
        );
      })
      .map((request) => request.identifier)
  );
  return {
    badgeCount: badgeCounts.get(now.toISOString()) ?? 0,
    toCancel: existing.filter(
      (request) => !matchingIds.has(request.identifier)
    ),
    toSchedule: wanted.filter(
      (reminder) => !matchingIds.has(reminder.identifier)
    ),
    wanted,
  };
}

function getCandidates({
  items,
  completionLogs,
  now,
  timezone,
  language,
}: PlanInput) {
  const rangeEnd = addDays(now, 30);
  const range = { startUtc: now.toISOString(), endUtc: rangeEnd.toISOString() };
  const logsByItem = new Map<string, OccurrenceLog[]>();
  for (const log of completionLogs) {
    const logs = logsByItem.get(log.itemId) ?? [];
    logs.push(log);
    logsByItem.set(log.itemId, logs);
  }

  return items.flatMap((item) => {
    const rule = currentRule(item);
    if (
      item.isArchived ||
      !rule.notificationsEnabled ||
      item.contentStatus === "unrecoverable"
    )
      return [];
    const logs = logsByItem.get(item.id) ?? [];
    const projection = createOccurrences({
      logs,
      now,
      schedules: [item],
      timezone,
    });
    // 완료일 기준은 과거의 미처리 occurrence가 있으면 다음 알림을 기다린다.
    if (
      rule.anchorType === "completion_based" &&
      supportsCompletion(rule.recurrenceType) &&
      projection
        .range({
          startUtc: toUtcRange(item.startDateLocal, timezone).startUtc,
          endUtc: range.startUtc,
        })
        .some(
          ({ occurrence }) =>
            occurrence.scheduledAtUtc < range.startUtc &&
            (occurrence.status === "scheduled" ||
              occurrence.status === "overdue")
        )
    )
      return [];

    const occurrences = projection
      .range(range, "scheduled")
      .map(({ occurrence }) => occurrence);
    // range는 종료 시각을 포함하므로 그 다음 밀리초부터 첫 occurrence를 찾는다.
    const next = createOccurrences({
      logs,
      now: new Date(rangeEnd.getTime() + 1),
      schedules: [item],
      timezone,
    }).next(item.id);
    if (next) occurrences.push(next);

    return occurrences.map((occurrence) => ({
      itemId: item.id,
      scheduledAtUtc: occurrence.scheduledAtUtc,
      title: item.title,
      body: formatTimestamp(
        occurrence.scheduledAtUtc,
        timezone,
        "time",
        language
      ),
    }));
  });
}
