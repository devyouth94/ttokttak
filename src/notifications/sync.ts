import * as Notifications from "expo-notifications";

import type { AppLanguage } from "~/i18n/language";
import { listItems } from "~/schedule/db/items";
import { listLogs } from "~/schedule/db/logs";
import { captureException } from "~/sentry";
import { supabase } from "~/supabase";

import { type Candidate, getBadgeCounts, getCandidates } from "./candidates";
import { getPermission } from "./permission";

const PREFIX = "ttokttak:reminder:";
const CHANNEL_ID = "reminders";
const MAX_NOTIFICATIONS = 60;

type NotificationSyncParams = {
  language: AppLanguage;
  timezone: string;
  userId: string;
};

// ponytail: 호출량이 적어 전역 큐로 충분하다. 병목이 측정되면 최신 요청 병합으로 바꾼다.
let notificationSyncTail = Promise.resolve();

export const notificationSyncStages = [
  "permission",
  "items",
  "logs",
  "candidates",
  "list-scheduled",
  "cancel",
  "schedule",
  "verify",
] as const;

export type NotificationSyncStage = (typeof notificationSyncStages)[number];
export type NotificationSyncErrorCode =
  | "operation-failed"
  | "verification-mismatch";

/** 원본 오류 내용을 노출하지 않고 실패 단계와 내부 코드만 전달한다. */
export class NotificationSyncError extends Error {
  constructor(
    public readonly stage: NotificationSyncStage,
    public readonly errorCode: NotificationSyncErrorCode,
    cause?: unknown
  ) {
    super("알림 동기화에 실패했습니다.", { cause });
    this.name = "NotificationSyncError";
  }
}

type Reminder = Candidate & {
  badgeCount: number;
  identifier: string;
};

async function getAccessToken(userId: string): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session?.user.id === userId ? data.session.access_token : null;
}

async function loadNotificationData(userId: string) {
  const items = await runStage("items", () => listItems({ userId }));
  const itemIds = items.map((item) => item.id);
  const completionLogs = itemIds.length
    ? await runStage("logs", () => listLogs({ itemIds, userId }))
    : [];

  return { completionLogs, items };
}

/**
 * 원하는 알림 후보와 Expo 예약 목록을 비교한다.
 * 기존 내용은 유지하고, 달라진 알림만 취소하거나 새로 예약한다.
 */
async function applyCandidates(
  candidates: Candidate[],
  data: Awaited<ReturnType<typeof loadNotificationData>>,
  now: Date,
  timezone: string,
  userId: string
): Promise<void> {
  const requests = await runStage("list-scheduled", () =>
    Notifications.getAllScheduledNotificationsAsync()
  );
  const existing = requests.filter((request) =>
    request.identifier.startsWith(PREFIX)
  );
  const available = Math.max(
    0,
    MAX_NOTIFICATIONS - (requests.length - existing.length)
  );
  const wantedCandidates = candidates
    .map((candidate) => ({
      ...candidate,
      identifier: `${PREFIX}${userId}:${candidate.itemId}:${candidate.scheduledAtUtc}`,
    }))
    .sort((left, right) =>
      left.scheduledAtUtc.localeCompare(right.scheduledAtUtc)
    )
    .slice(0, available);
  const badgeCounts = getBadgeCounts({
    completionLogs: data.completionLogs,
    items: data.items,
    times: [
      now,
      ...wantedCandidates.map(({ scheduledAtUtc }) => new Date(scheduledAtUtc)),
    ],
    timezone,
  });
  reportFailures(
    await Promise.allSettled([
      Notifications.setBadgeCountAsync(badgeCounts.get(now.toISOString()) ?? 0),
      dismissStaleNotifications(data, userId),
    ]),
    "app-icon-badge-sync"
  );
  const wanted: Reminder[] = wantedCandidates.map((reminder) => ({
    ...reminder,
    badgeCount: badgeCounts.get(reminder.scheduledAtUtc) ?? 0,
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
  let changed = false;

  for (const request of existing) {
    if (!matchingIds.has(request.identifier)) {
      await runStage("cancel", () =>
        Notifications.cancelScheduledNotificationAsync(request.identifier)
      );
      changed = true;
    }
  }

  for (const reminder of wanted) {
    if (matchingIds.has(reminder.identifier)) {
      continue;
    }

    await runStage("schedule", () =>
      Notifications.scheduleNotificationAsync({
        content: {
          badge: reminder.badgeCount,
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
      })
    );
    changed = true;
  }

  if (changed) {
    const verified = await runStage("verify", () =>
      Notifications.getAllScheduledNotificationsAsync()
    );
    const verifiedIds = new Set(
      verified
        .filter((request) => request.identifier.startsWith(PREFIX))
        .map((request) => request.identifier)
    );

    if (
      verifiedIds.size !== wanted.length ||
      wanted.some((reminder) => !verifiedIds.has(reminder.identifier))
    ) {
      throw new NotificationSyncError("verify", "verification-mismatch");
    }
  }
}

/** 처리됐거나 현재 사용자에게 속하지 않는 표시 알림을 제거한다. */
async function dismissStaleNotifications(
  data: Awaited<ReturnType<typeof loadNotificationData>>,
  userId: string
): Promise<void> {
  const ownerPrefix = `${PREFIX}${userId}:`;
  const activeItemPrefixes = data.items.map(
    (item) => `${ownerPrefix}${item.id}:`
  );
  const handledIds = new Set(
    data.completionLogs.map(
      (log) => `${ownerPrefix}${log.itemId}:${log.scheduledAtUtc}`
    )
  );
  const notifications = await Notifications.getPresentedNotificationsAsync();

  await Promise.all(
    notifications
      .map(({ request }) => request.identifier)
      .filter(
        (identifier) =>
          identifier.startsWith(PREFIX) &&
          (!identifier.startsWith(ownerPrefix) ||
            handledIds.has(identifier) ||
            !activeItemPrefixes.some((prefix) => identifier.startsWith(prefix)))
      )
      .map((identifier) => Notifications.dismissNotificationAsync(identifier))
  );
}

function reportFailures(
  results: PromiseSettledResult<unknown>[],
  feature: string
): void {
  for (const result of results) {
    if (result.status === "rejected") {
      captureException(result.reason, { tags: { feature } });
    }
  }
}

/** Provider가 세션·언어·timezone 변화와 mutation 뒤 호출하는 전체 동기화 진입점이다. */
export function syncNotifications(
  params: NotificationSyncParams
): Promise<void> {
  const sync = notificationSyncTail.then(() => syncNotificationsNow(params));
  notificationSyncTail = sync.catch(() => undefined);
  return sync;
}

async function syncNotificationsNow(
  params: NotificationSyncParams
): Promise<void> {
  const permission = await runStage("permission", getPermission);

  if (permission.status !== "granted") {
    return;
  }

  const accessToken = await runStage("items", () =>
    getAccessToken(params.userId)
  );

  if (!accessToken) {
    return;
  }

  let data;

  try {
    data = await loadNotificationData(params.userId);
  } catch (error) {
    const refreshedAccessToken = await runStage("items", () =>
      getAccessToken(params.userId)
    );

    if (!refreshedAccessToken) {
      return;
    }

    if (refreshedAccessToken === accessToken) {
      throw error;
    }

    // ponytail: 연속 세션 갱신은 다음 lifecycle 동기화에 맡기고 한 번만 재조회한다.
    data = await loadNotificationData(params.userId);
  }

  const { completionLogs, items } = data;
  const now = new Date();
  const candidates = await runStage("candidates", () =>
    getCandidates({
      completionLogs,
      items,
      language: params.language,
      now,
      timezone: params.timezone,
    })
  );
  await applyCandidates(candidates, data, now, params.timezone, params.userId);
}

async function runStage<T>(
  stage: NotificationSyncStage,
  operation: () => Promise<T> | T
): Promise<T> {
  try {
    return await operation();
  } catch (cause) {
    if (cause instanceof NotificationSyncError) {
      throw cause;
    }

    throw new NotificationSyncError(stage, "operation-failed", cause);
  }
}

/** 로그아웃과 계정 삭제 뒤 현재 기기의 모든 똑딱 알림과 뱃지를 정리한다. */
export async function cancelNotifications(): Promise<void> {
  reportFailures(
    await Promise.allSettled([
      Notifications.getAllScheduledNotificationsAsync().then((requests) =>
        Promise.all(
          requests
            .filter((request) => request.identifier.startsWith(PREFIX))
            .map((request) =>
              Notifications.cancelScheduledNotificationAsync(request.identifier)
            )
        )
      ),
      Notifications.getPresentedNotificationsAsync().then((notifications) =>
        Promise.all(
          notifications
            .filter(({ request }) => request.identifier.startsWith(PREFIX))
            .map(({ request }) =>
              Notifications.dismissNotificationAsync(request.identifier)
            )
        )
      ),
      Notifications.setBadgeCountAsync(0),
    ]),
    "local-notification-cleanup"
  );
}
