import * as Notifications from "expo-notifications";

import type { AppLanguage } from "~/i18n/app-language";
import { listItems } from "~/schedule/db/items";
import { listLogs } from "~/schedule/db/logs";

import { type Candidate, getCandidates } from "./candidates";
import { getPermission } from "./permission";

const PREFIX = "ttokttak:reminder:";
const CHANNEL_ID = "reminders";
const MAX_NOTIFICATIONS = 60;

type Reminder = Candidate & {
  identifier: string;
};

/**
 * 원하는 알림 후보와 Expo 예약 목록을 비교한다.
 * 기존 내용은 유지하고, 달라진 알림만 취소하거나 새로 예약한다.
 */
async function applyCandidates(
  candidates: Candidate[],
  userId: string
): Promise<void> {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  const existing = requests.filter((request) =>
    request.identifier.startsWith(PREFIX)
  );
  const available = Math.max(
    0,
    MAX_NOTIFICATIONS - (requests.length - existing.length)
  );
  const wanted: Reminder[] = candidates
    .map((candidate) => ({
      ...candidate,
      identifier: `${PREFIX}${userId}:${candidate.itemId}:${candidate.scheduledAtUtc}`,
    }))
    .sort((left, right) =>
      left.scheduledAtUtc.localeCompare(right.scheduledAtUtc)
    )
    .slice(0, available);
  const wantedById = new Map(
    wanted.map((reminder) => [reminder.identifier, reminder])
  );
  const matchingIds = new Set(
    existing
      .filter((request) => {
        const reminder = wantedById.get(request.identifier);

        return (
          reminder !== undefined &&
          request.content.body === reminder.body &&
          request.content.title === reminder.title
        );
      })
      .map((request) => request.identifier)
  );

  for (const request of existing) {
    if (!matchingIds.has(request.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  }

  for (const reminder of wanted) {
    if (matchingIds.has(reminder.identifier)) {
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        body: reminder.body,
        data: {
          notificationKind: "reminder",
          source: "recurring-item",
        },
        priority: Notifications.AndroidNotificationPriority.HIGH,
        sound: "default",
        title: reminder.title,
      },
      identifier: reminder.identifier,
      trigger: {
        channelId: CHANNEL_ID,
        date: new Date(reminder.scheduledAtUtc),
        type: Notifications.SchedulableTriggerInputTypes.DATE,
      },
    });
  }
}

/** Provider가 세션·언어·timezone 변화와 mutation 뒤 호출하는 전체 동기화 진입점이다. */
export async function syncNotifications(params: {
  language: AppLanguage;
  timezone: string;
  userId: string;
}): Promise<void> {
  if ((await getPermission()).status !== "granted") {
    return;
  }

  const items = await listItems({
    userId: params.userId,
  });
  const itemIds = items.map((item) => item.id);
  const completionLogs = itemIds.length
    ? await listLogs({ itemIds, userId: params.userId })
    : [];
  const candidates = getCandidates({
    completionLogs,
    items,
    language: params.language,
    now: new Date(),
    timezone: params.timezone,
  });

  await applyCandidates(candidates, params.userId);
}

/** 로그아웃과 계정 삭제 뒤 현재 기기의 모든 똑딱 알림을 취소한다. */
export async function cancelNotifications(): Promise<void> {
  const requests = await Notifications.getAllScheduledNotificationsAsync();

  for (const request of requests) {
    if (request.identifier.startsWith(PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  }
}
