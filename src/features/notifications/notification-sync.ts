import * as Notifications from "expo-notifications";
import { addDays } from "date-fns";

import { getOccurrencesInRange } from "~/features/recurring/domain/occurrence";
import type {
  CompletionLog,
  RecurringItem,
} from "~/features/recurring/domain/types";
import { listCompletionLogs } from "~/features/recurring/repositories/completion-logs-repository";
import { upsertDevice } from "~/features/recurring/repositories/devices-repository";
import { listRecurringItems } from "~/features/recurring/repositories/recurring-items-repository";

import {
  getCurrentDeviceName,
  getCurrentDevicePlatform,
  getOrCreateNotificationDeviceId,
} from "./device-identity";
import {
  createNotificationSyncPlan,
  type DesiredScheduledNotification,
  type NotificationSyncReason,
  type NotificationSyncScope,
} from "./notification-sync.helpers";

type NotificationSyncExecutionParams = {
  reason: NotificationSyncReason;
  scope: NotificationSyncScope;
  timezone: string;
  userId: string;
};

type NotificationSyncExecutionResult = {
  cancelledCount: number;
  detail: string;
  deviceId: string;
  reason: NotificationSyncReason;
  scheduledCount: number;
};

type ManagedNotificationData = {
  deviceId: string;
  itemId: string;
  scheduledAtUtc: string;
  source: "recurring-item";
  userId: string;
};

function isManagedNotificationData(
  value: unknown
): value is ManagedNotificationData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.source === "recurring-item" &&
    typeof candidate.userId === "string" &&
    typeof candidate.deviceId === "string" &&
    typeof candidate.itemId === "string" &&
    typeof candidate.scheduledAtUtc === "string"
  );
}

function createManagedNotificationIdentifier(params: {
  deviceId: string;
  itemId: string;
  scheduledAtUtc: string;
}): string {
  const { deviceId, itemId, scheduledAtUtc } = params;

  return `ttokttak:${deviceId}:${itemId}:${scheduledAtUtc}`;
}

function createManagedNotificationBody(item: RecurringItem): string {
  return (
    item.description?.trim() || `${item.reminderTimeLocal}에 확인할 일정입니다.`
  );
}

function createManagedNotificationTitle(item: RecurringItem): string {
  return item.title;
}

function createDesiredNotifications(params: {
  completionLogs: CompletionLog[];
  item: RecurringItem;
  rangeEndUtc: string;
  rangeStartUtc: string;
  timezone: string;
}): DesiredScheduledNotification[] {
  const { completionLogs, item, rangeEndUtc, rangeStartUtc, timezone } = params;

  if (item.isArchived || !item.notificationsEnabled) {
    return [];
  }

  return getOccurrencesInRange(
    item,
    rangeStartUtc,
    rangeEndUtc,
    timezone,
    completionLogs,
    rangeStartUtc
  )
    .filter((occurrence) => occurrence.status === "scheduled")
    .map((occurrence) => ({
      body: createManagedNotificationBody(item),
      itemId: item.id,
      scheduledAtUtc: occurrence.scheduledAtUtc,
      title: createManagedNotificationTitle(item),
    }));
}

async function listManagedScheduledNotifications(params: {
  deviceId: string;
  userId: string;
}) {
  const scheduledNotifications =
    await Notifications.getAllScheduledNotificationsAsync();

  return scheduledNotifications.flatMap((notification) => {
    const data = notification.content.data;

    if (!isManagedNotificationData(data)) {
      return [];
    }

    if (data.userId !== params.userId || data.deviceId !== params.deviceId) {
      return [];
    }

    return [
      {
        body: notification.content.body ?? "",
        data,
        identifier: notification.identifier,
        itemId: data.itemId,
        scheduledAtUtc: data.scheduledAtUtc,
        title: notification.content.title ?? "",
      },
    ];
  });
}

async function cancelScheduledNotifications(
  identifiers: string[]
): Promise<void> {
  await Promise.all(
    identifiers.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier)
    )
  );
}

async function scheduleNotifications(params: {
  deviceId: string;
  notifications: DesiredScheduledNotification[];
  userId: string;
}): Promise<void> {
  const { deviceId, notifications, userId } = params;

  await Promise.all(
    notifications.map((notification) =>
      Notifications.scheduleNotificationAsync({
        content: {
          body: notification.body,
          data: {
            deviceId,
            itemId: notification.itemId,
            scheduledAtUtc: notification.scheduledAtUtc,
            source: "recurring-item",
            userId,
          } satisfies ManagedNotificationData,
          title: notification.title,
        },
        identifier: createManagedNotificationIdentifier({
          deviceId,
          itemId: notification.itemId,
          scheduledAtUtc: notification.scheduledAtUtc,
        }),
        trigger: {
          date: new Date(notification.scheduledAtUtc),
          type: Notifications.SchedulableTriggerInputTypes.DATE,
        },
      })
    )
  );
}

export async function syncCurrentDeviceNotifications(
  params: NotificationSyncExecutionParams
): Promise<NotificationSyncExecutionResult> {
  const { reason, scope, timezone, userId } = params;
  const deviceId = await getOrCreateNotificationDeviceId();
  const now = new Date();
  const nowUtc = now.toISOString();
  const rangeEndUtc = addDays(now, 14).toISOString();

  await upsertDevice({
    deviceName: getCurrentDeviceName(),
    id: deviceId,
    isActive: true,
    lastSeenAt: nowUtc,
    platform: getCurrentDevicePlatform(),
    userId,
  });

  const items = await listRecurringItems({
    timezone,
    userId,
  });
  const itemIds = items.map((item) => item.id);
  const completionLogs =
    itemIds.length > 0
      ? await listCompletionLogs({
          itemIds,
          userId,
        })
      : [];
  const completionLogsByItem = completionLogs.reduce<
    Record<string, CompletionLog[]>
  >((accumulator, log) => {
    const currentLogs = accumulator[log.itemId] ?? [];

    currentLogs.push(log);
    accumulator[log.itemId] = currentLogs;

    return accumulator;
  }, {});
  const desiredNotifications = items.flatMap((item) =>
    createDesiredNotifications({
      completionLogs: completionLogsByItem[item.id] ?? [],
      item,
      rangeEndUtc,
      rangeStartUtc: nowUtc,
      timezone,
    })
  );
  const existingNotifications = await listManagedScheduledNotifications({
    deviceId,
    userId,
  });
  const plan = createNotificationSyncPlan({
    desired: desiredNotifications,
    existing: existingNotifications,
    scope,
  });

  if (plan.notificationsToCancel.length > 0) {
    await cancelScheduledNotifications(
      plan.notificationsToCancel.map((entry) => entry.identifier)
    );
  }

  if (plan.notificationsToSchedule.length > 0) {
    await scheduleNotifications({
      deviceId,
      notifications: plan.notificationsToSchedule,
      userId,
    });
  }

  return {
    cancelledCount: plan.notificationsToCancel.length,
    detail: `예약 ${plan.notificationsToSchedule.length}건, 취소 ${plan.notificationsToCancel.length}건을 반영했습니다.`,
    deviceId,
    reason,
    scheduledCount: plan.notificationsToSchedule.length,
  };
}
