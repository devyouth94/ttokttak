import * as Notifications from "expo-notifications";

import type { DeviceSyncInput } from "~/device-sync-session";
import { captureException } from "~/sentry";

import { planNotifications, REMINDER_PREFIX as PREFIX } from "./plan";

const CHANNEL_ID = "reminders";

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

/**
 * 원하는 알림 후보와 Expo 예약 목록을 비교한다.
 * 기존 내용은 유지하고, 달라진 알림만 취소하거나 새로 예약한다.
 */
export async function applyNotifications(
  input: DeviceSyncInput,
  step: NotificationStep
): Promise<void> {
  const requests = await step("list-scheduled", () =>
    Notifications.getAllScheduledNotificationsAsync()
  );
  const plan = await step("candidates", () =>
    planNotifications({ ...input, requests })
  );
  await step("cancel", () =>
    settleWrites(
      [
        Notifications.setBadgeCountAsync(plan.badgeCount),
        dismissStaleNotifications(input),
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
async function dismissStaleNotifications({
  items,
  completionLogs,
  userId,
}: DeviceSyncInput): Promise<void> {
  const ownerPrefix = `${PREFIX}${userId}:`;
  const activeItemPrefixes = items.map((item) => `${ownerPrefix}${item.id}:`);
  const handledIds = new Set(
    completionLogs.map(
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
