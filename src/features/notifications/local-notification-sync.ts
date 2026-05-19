import * as Notifications from "expo-notifications";

import {
  createLocalReminderNotificationProjection,
  type DesiredLocalReminderNotification,
  type ExistingLocalReminderNotification,
  isTtokttakLocalReminderIdentifier,
  parseLocalReminderIdentifier,
} from "~/features/notifications/local-reminder-notification-projection";
import { getNotificationPermissionState } from "~/features/notifications/notification-permission";
import type {
  NotificationSyncReason,
  NotificationSyncScope,
} from "~/features/notifications/notification-sync.types";
import { listCompletionLogs } from "~/features/recurring/repositories/completion-logs-repository";
import { listRecurringItems } from "~/features/recurring/repositories/recurring-items-repository";

const REMINDER_NOTIFICATION_CHANNEL_ID = "reminders";
const MAX_PENDING_LOCAL_NOTIFICATIONS = 60;

type LocalReminderNotificationSyncParams = {
  reason: NotificationSyncReason;
  scope: NotificationSyncScope;
  timezone: string;
  userId: string;
};

type LocalReminderNotificationSyncResult = {
  cancelledCount: number;
  diagnostics: {
    candidateCount: number;
    omittedDistantCount: number;
    scheduledCount: number;
  };
  scheduledCount: number;
};

type LocalReminderNotificationCancellationResult = {
  cancelledCount: number;
};

type LocalReminderNotificationSyncPlan = {
  diagnostics: LocalReminderNotificationSyncResult["diagnostics"];
  notificationsToCancel: ExistingLocalReminderNotification[];
  notificationsToSchedule: DesiredLocalReminderNotification[];
};

function isWithinScope(
  notification: Pick<
    ExistingLocalReminderNotification,
    "itemId" | "scheduledAtUtc"
  >,
  scope: NotificationSyncScope
): boolean {
  if (scope.type === "all") {
    return true;
  }

  return (
    notification.itemId === scope.itemId &&
    notification.scheduledAtUtc >= scope.effectiveFromUtc
  );
}

export function createLocalReminderNotificationSyncPlan(params: {
  desiredNotifications: DesiredLocalReminderNotification[];
  existingNotifications: ExistingLocalReminderNotification[];
  maxPendingLocalNotifications?: number;
  pendingNotificationCount: number;
  scope: NotificationSyncScope;
}): LocalReminderNotificationSyncPlan {
  const {
    desiredNotifications,
    existingNotifications,
    pendingNotificationCount,
    scope,
  } = params;
  const maxPendingLocalNotifications =
    params.maxPendingLocalNotifications ?? MAX_PENDING_LOCAL_NOTIFICATIONS;
  const scopedDesiredNotifications = desiredNotifications.filter(
    (notification) => isWithinScope(notification, scope)
  );
  const scopedExistingNotifications = existingNotifications.filter(
    (notification) => isWithinScope(notification, scope)
  );
  const desiredIdentifiers = new Set(
    scopedDesiredNotifications.map((notification) => notification.identifier)
  );
  const existingIdentifiers = new Set(
    scopedExistingNotifications.map((notification) => notification.identifier)
  );
  const notificationsToCancel = scopedExistingNotifications.filter(
    (notification) => !desiredIdentifiers.has(notification.identifier)
  );
  const remainingPendingCount =
    pendingNotificationCount - notificationsToCancel.length;
  const availableScheduleSlots = Math.max(
    0,
    maxPendingLocalNotifications - remainingPendingCount
  );
  const notificationsReadyToSchedule = scopedDesiredNotifications
    .filter((notification) => !existingIdentifiers.has(notification.identifier))
    .sort((left, right) =>
      left.scheduledAtUtc.localeCompare(right.scheduledAtUtc)
    );
  const notificationsToSchedule = notificationsReadyToSchedule.slice(
    0,
    availableScheduleSlots
  );

  return {
    diagnostics: {
      candidateCount: scopedDesiredNotifications.length,
      omittedDistantCount:
        notificationsReadyToSchedule.length - notificationsToSchedule.length,
      scheduledCount: notificationsToSchedule.length,
    },
    notificationsToCancel,
    notificationsToSchedule,
  };
}

function parseExistingLocalReminderNotifications(params: {
  scheduledNotificationRequests: Notifications.NotificationRequest[];
  userId: string;
}): ExistingLocalReminderNotification[] {
  const { scheduledNotificationRequests, userId } = params;

  return scheduledNotificationRequests
    .map((notification) =>
      parseLocalReminderIdentifier(notification.identifier, userId)
    )
    .filter((notification) => notification !== null);
}

async function applyLocalReminderNotificationSyncPlan(
  plan: LocalReminderNotificationSyncPlan
): Promise<void> {
  for (const notification of plan.notificationsToCancel) {
    await Notifications.cancelScheduledNotificationAsync(
      notification.identifier
    );
  }

  for (const notification of plan.notificationsToSchedule) {
    await Notifications.scheduleNotificationAsync({
      content: {
        body: notification.body,
        data: notification.payload,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        sound: "default",
        title: notification.title,
      },
      identifier: notification.identifier,
      trigger: {
        channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
        date: new Date(notification.scheduledAtUtc),
        type: Notifications.SchedulableTriggerInputTypes.DATE,
      },
    });
  }
}

export async function syncLocalReminderNotifications(
  params: LocalReminderNotificationSyncParams
): Promise<LocalReminderNotificationSyncResult> {
  const { scope, timezone, userId } = params;
  const permission = await getNotificationPermissionState();

  if (permission.status !== "granted") {
    return {
      cancelledCount: 0,
      diagnostics: {
        candidateCount: 0,
        omittedDistantCount: 0,
        scheduledCount: 0,
      },
      scheduledCount: 0,
    };
  }

  const now = new Date();
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
  const { notifications: desiredNotifications } =
    createLocalReminderNotificationProjection({
      completionLogs,
      items,
      timezone,
      userId,
      now,
    });
  const scheduledNotificationRequests =
    await Notifications.getAllScheduledNotificationsAsync();
  const existingNotifications = parseExistingLocalReminderNotifications({
    scheduledNotificationRequests,
    userId,
  });
  const syncPlan = createLocalReminderNotificationSyncPlan({
    desiredNotifications,
    existingNotifications,
    pendingNotificationCount: scheduledNotificationRequests.length,
    scope,
  });

  await applyLocalReminderNotificationSyncPlan(syncPlan);

  return {
    cancelledCount: syncPlan.notificationsToCancel.length,
    diagnostics: syncPlan.diagnostics,
    scheduledCount: syncPlan.notificationsToSchedule.length,
  };
}

export async function cancelAllTtokttakLocalReminderNotifications(): Promise<LocalReminderNotificationCancellationResult> {
  const scheduledNotificationRequests =
    await Notifications.getAllScheduledNotificationsAsync();
  const reminderNotifications = scheduledNotificationRequests.filter(
    (notification) => isTtokttakLocalReminderIdentifier(notification.identifier)
  );

  for (const notification of reminderNotifications) {
    await Notifications.cancelScheduledNotificationAsync(
      notification.identifier
    );
  }

  return {
    cancelledCount: reminderNotifications.length,
  };
}
