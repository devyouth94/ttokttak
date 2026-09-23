import * as Notifications from "expo-notifications";

import type { AppLanguage } from "~/i18n/language";
import { listItems } from "~/schedule/db/items";
import { listLogs } from "~/schedule/db/logs";
import { captureException } from "~/sentry";
import { supabase } from "~/supabase";

import { getPermission } from "./permission";
import { planNotifications, REMINDER_PREFIX as PREFIX } from "./plan";

const CHANNEL_ID = "reminders";

export type NotificationSyncParams = {
  language: AppLanguage;
  timezone: string;
  userId: string;
};

export type NotificationStep = <T>(
  stage: NotificationSyncStage,
  operation: () => Promise<T> | T
) => Promise<T>;

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

/** 한 번의 동기화. 세션은 단계 실행과 OS 쓰기 순서만 제어한다. */
export async function syncNotificationsNow(
  params: NotificationSyncParams,
  step: NotificationStep,
  write: (operation: () => Promise<void>) => Promise<void>
): Promise<void> {
  const permission = await step("permission", getPermission);

  if (permission.status !== "granted") {
    return;
  }

  const accessToken = await step("items", () => getAccessToken(params.userId));

  if (!accessToken) {
    return;
  }

  let data;

  try {
    data = await loadNotificationData(params.userId, step);
  } catch (error) {
    const refreshedAccessToken = await step("items", () =>
      getAccessToken(params.userId)
    );

    if (!refreshedAccessToken) {
      return;
    }

    if (refreshedAccessToken === accessToken) {
      throw error;
    }

    // ponytail: 연속 세션 갱신은 다음 lifecycle 동기화에 맡기고 한 번만 재조회한다.
    data = await loadNotificationData(params.userId, step);
  }

  await write(() => applyNotifications(data, params, step));
}

async function loadNotificationData(userId: string, step: NotificationStep) {
  const items = await step("items", () => listItems({ userId }));
  const itemIds = items.map((item) => item.id);
  const completionLogs = itemIds.length
    ? await step("logs", () => listLogs({ itemIds, userId }))
    : [];

  return { completionLogs, items };
}

async function getAccessToken(userId: string): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session?.user.id === userId ? data.session.access_token : null;
}

/**
 * 원하는 알림 후보와 Expo 예약 목록을 비교한다.
 * 기존 내용은 유지하고, 달라진 알림만 취소하거나 새로 예약한다.
 */
async function applyNotifications(
  data: Awaited<ReturnType<typeof loadNotificationData>>,
  params: NotificationSyncParams,
  step: NotificationStep
): Promise<void> {
  const requests = await step("list-scheduled", () =>
    Notifications.getAllScheduledNotificationsAsync()
  );
  const plan = await step("candidates", () =>
    planNotifications({ ...data, ...params, now: new Date(), requests })
  );
  await step("cancel", () =>
    settleWrites(
      [
        Notifications.setBadgeCountAsync(plan.badgeCount),
        dismissStaleNotifications(data, params.userId),
      ],
      "app-icon-badge-sync"
    )
  );

  for (const request of plan.toCancel) {
    await step("cancel", () =>
      Notifications.cancelScheduledNotificationAsync(request.identifier)
    );
  }

  for (const reminder of plan.toSchedule) {
    await step("schedule", () =>
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
  }

  if (plan.toCancel.length || plan.toSchedule.length) {
    const verified = await step("verify", () =>
      Notifications.getAllScheduledNotificationsAsync()
    );
    const verifiedIds = new Set(
      verified
        .filter((request) => request.identifier.startsWith(PREFIX))
        .map((request) => request.identifier)
    );

    if (
      verifiedIds.size !== plan.wanted.length ||
      plan.wanted.some((reminder) => !verifiedIds.has(reminder.identifier))
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

  await settleWrites(
    notifications
      .map(({ request }) => request.identifier)
      .filter(
        (identifier) =>
          identifier.startsWith(PREFIX) &&
          (!identifier.startsWith(ownerPrefix) ||
            handledIds.has(identifier) ||
            !activeItemPrefixes.some((prefix) => identifier.startsWith(prefix)))
      )
      .map((identifier) => Notifications.dismissNotificationAsync(identifier)),
    "app-icon-badge-sync"
  );
}

/** 현재 기기의 똑딱 예약·표시 알림·배지를 정리한다. 세션의 쓰기 큐 안에서 호출한다. */
export async function clearNotifications(): Promise<void> {
  await settleWrites(
    [
      Notifications.getAllScheduledNotificationsAsync().then((requests) =>
        settleWrites(
          requests
            .filter((request) => request.identifier.startsWith(PREFIX))
            .map((request) =>
              Notifications.cancelScheduledNotificationAsync(request.identifier)
            ),
          "local-notification-cleanup"
        )
      ),
      Notifications.getPresentedNotificationsAsync().then((notifications) =>
        settleWrites(
          notifications
            .filter(({ request }) => request.identifier.startsWith(PREFIX))
            .map(({ request }) =>
              Notifications.dismissNotificationAsync(request.identifier)
            ),
          "local-notification-cleanup"
        )
      ),
      Notifications.setBadgeCountAsync(0),
    ],
    "local-notification-cleanup"
  );
}

async function settleWrites(
  operations: Promise<unknown>[],
  feature: string
): Promise<void> {
  // 일부가 실패해도 시작한 쓰기가 모두 끝나야 다음 세션의 쓰기를 허용한다.
  const results = await Promise.allSettled(operations);
  for (const result of results) {
    if (result.status === "rejected") {
      captureException(result.reason, { tags: { feature } });
    }
  }
}
