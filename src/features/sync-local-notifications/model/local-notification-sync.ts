import {
  listCompletionLogs,
  listRecurringItems,
} from "~/entities/schedule/api";
import {
  createLocalReminderNotificationProjection,
  type DesiredLocalReminderNotification,
  type ExistingLocalReminderNotification,
} from "~/features/sync-local-notifications/model/local-reminder-notification-projection";
import type {
  NotificationSyncReason,
  NotificationSyncScope,
} from "~/features/sync-local-notifications/model/notification-sync.types";
import type { AppLanguage } from "~/shared/i18n";
import {
  cancelScheduledLocalNotification,
  createLocalReminderPayload,
  getAllScheduledLocalNotifications,
  getNotificationPermissionState,
  isTtokttakLocalReminderIdentifier,
  type LocalNotificationRequest,
  type LocalReminderNotificationPayload,
  parseLocalReminderIdentifier,
  scheduleDateLocalNotification,
} from "~/shared/lib/notifications";

const REMINDER_NOTIFICATION_CHANNEL_ID = "reminders";
const MAX_PENDING_LOCAL_NOTIFICATIONS = 60;

type LocalReminderNotificationSyncParams = {
  language?: AppLanguage;
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
  notificationsToReplace: {
    existing: ExistingLocalReminderNotification;
    next: DesiredLocalReminderNotification;
  }[];
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
  const existingNotificationCountOutsideScope =
    pendingNotificationCount - scopedExistingNotifications.length;
  const availableScopedNotificationSlots = Math.max(
    0,
    maxPendingLocalNotifications - existingNotificationCountOutsideScope
  );
  const desiredNotificationsWithinLimit = [...scopedDesiredNotifications]
    .sort((left, right) =>
      left.scheduledAtUtc.localeCompare(right.scheduledAtUtc)
    )
    .slice(0, availableScopedNotificationSlots);
  const desiredIdentifiersWithinLimit = new Set(
    desiredNotificationsWithinLimit.map(
      (notification) => notification.identifier
    )
  );
  const desiredNotificationsByIdentifier = new Map(
    desiredNotificationsWithinLimit.map((notification) => [
      notification.identifier,
      notification,
    ])
  );
  const hasSameContentAsDesiredNotification = (
    notification: ExistingLocalReminderNotification
  ): boolean => {
    const desiredNotification = desiredNotificationsByIdentifier.get(
      notification.identifier
    );

    return (
      desiredNotification !== undefined &&
      notification.body === desiredNotification.body &&
      notification.title === desiredNotification.title
    );
  };
  const notificationsToReplace = scopedExistingNotifications
    .filter(
      (notification) =>
        desiredIdentifiersWithinLimit.has(notification.identifier) &&
        !hasSameContentAsDesiredNotification(notification)
    )
    .map((notification) => ({
      existing: notification,
      next: desiredNotificationsByIdentifier.get(notification.identifier),
    }))
    .filter(
      (
        replacement
      ): replacement is {
        existing: ExistingLocalReminderNotification;
        next: DesiredLocalReminderNotification;
      } => replacement.next !== undefined
    );
  const identifiersToReplace = new Set(
    notificationsToReplace.map(({ existing }) => existing.identifier)
  );
  const notificationsToCancel = scopedExistingNotifications.filter(
    (notification) =>
      !desiredIdentifiersWithinLimit.has(notification.identifier)
  );
  const remainingPendingCount =
    pendingNotificationCount -
    notificationsToCancel.length -
    notificationsToReplace.length;
  const availableScheduleSlots = Math.max(
    0,
    maxPendingLocalNotifications - remainingPendingCount
  );
  const matchingExistingIdentifiers = new Set(
    scopedExistingNotifications
      .filter(hasSameContentAsDesiredNotification)
      .map((notification) => notification.identifier)
  );
  const notificationsReadyToSchedule = desiredNotificationsWithinLimit
    .filter(
      (notification) =>
        !matchingExistingIdentifiers.has(notification.identifier) &&
        !identifiersToReplace.has(notification.identifier)
    )
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
        scopedDesiredNotifications.length -
        desiredNotificationsWithinLimit.length,
      scheduledCount:
        notificationsToSchedule.length + notificationsToReplace.length,
    },
    notificationsToCancel,
    notificationsToReplace,
    notificationsToSchedule,
  };
}

function parseExistingLocalReminderNotifications(params: {
  scheduledNotificationRequests: LocalNotificationRequest[];
  userId: string;
}): ExistingLocalReminderNotification[] {
  const { scheduledNotificationRequests, userId } = params;

  return scheduledNotificationRequests
    .map((notification) => {
      const parsedIdentifier = parseLocalReminderIdentifier(
        notification.identifier,
        userId
      );

      if (parsedIdentifier === null) {
        return null;
      }

      return {
        ...parsedIdentifier,
        body: notification.content.body,
        title: notification.content.title,
      };
    })
    .filter((notification) => notification !== null);
}

async function applyLocalReminderNotificationSyncPlan(
  plan: LocalReminderNotificationSyncPlan
): Promise<void> {
  for (const replacement of plan.notificationsToReplace) {
    await replaceScheduledLocalNotification(replacement);
  }

  for (const notification of plan.notificationsToCancel) {
    await cancelScheduledLocalNotification(notification.identifier);
  }

  for (const notification of plan.notificationsToSchedule) {
    await scheduleReminderNotification(notification);
  }
}

async function scheduleReminderNotification(params: {
  body: string;
  payload: LocalReminderNotificationPayload;
  scheduledAtUtc: string;
  title: string;
  identifier: string;
}): Promise<void> {
  await scheduleDateLocalNotification({
    body: params.body,
    channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
    data: params.payload,
    identifier: params.identifier,
    scheduledAtUtc: params.scheduledAtUtc,
    title: params.title,
  });
}

async function replaceScheduledLocalNotification({
  existing,
  next,
}: {
  existing: ExistingLocalReminderNotification;
  next: DesiredLocalReminderNotification;
}): Promise<void> {
  await cancelScheduledLocalNotification(existing.identifier);

  try {
    await scheduleReminderNotification(next);
  } catch (error) {
    try {
      await scheduleReminderNotification({
        body: existing.body ?? "",
        identifier: existing.identifier,
        payload: createLocalReminderPayload(),
        scheduledAtUtc: existing.scheduledAtUtc,
        title: existing.title ?? "",
      });
    } catch {
      // 복구 실패는 원래 재예약 실패 원인을 가리지 않는다.
    }

    throw error;
  }
}

export async function syncLocalReminderNotifications(
  params: LocalReminderNotificationSyncParams
): Promise<LocalReminderNotificationSyncResult> {
  const { scope, timezone, userId } = params;
  const language = params.language ?? "ko";
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
      language,
      timezone,
      userId,
      now,
    });
  const scheduledNotificationRequests =
    await getAllScheduledLocalNotifications();
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
    cancelledCount:
      syncPlan.notificationsToCancel.length +
      syncPlan.notificationsToReplace.length,
    diagnostics: syncPlan.diagnostics,
    scheduledCount:
      syncPlan.notificationsToSchedule.length +
      syncPlan.notificationsToReplace.length,
  };
}

export async function cancelAllTtokttakLocalReminderNotifications(): Promise<LocalReminderNotificationCancellationResult> {
  const scheduledNotificationRequests =
    await getAllScheduledLocalNotifications();
  const reminderNotifications = scheduledNotificationRequests.filter(
    (notification) => isTtokttakLocalReminderIdentifier(notification.identifier)
  );

  for (const notification of reminderNotifications) {
    await cancelScheduledLocalNotification(notification.identifier);
  }

  return {
    cancelledCount: reminderNotifications.length,
  };
}
