import * as Notifications from "expo-notifications";
import { addDays } from "date-fns";

import type {
  NotificationDeliverySyncReason,
  NotificationDeliverySyncScope,
} from "~/features/notifications/notification-delivery-sync.types";
import { getNotificationPermissionState } from "~/features/notifications/notification-permission";
import { getOccurrencesInRange } from "~/features/recurring/domain/occurrence";
import type {
  CompletionLog,
  RecurringItem,
} from "~/features/recurring/domain/types";
import { listCompletionLogs } from "~/features/recurring/repositories/completion-logs-repository";
import { listRecurringItems } from "~/features/recurring/repositories/recurring-items-repository";
import { formatUtcTimeInTimezone } from "~/features/recurring/utils/recurring-display";

const REMINDER_NOTIFICATION_CHANNEL_ID = "reminders";
const LOCAL_REMINDER_IDENTIFIER_PREFIX = "ttokttak:reminder";

type LocalReminderNotificationSyncParams = {
  reason: NotificationDeliverySyncReason;
  scope: NotificationDeliverySyncScope;
  timezone: string;
  userId: string;
};

type LocalReminderNotificationSyncResult = {
  cancelledCount: number;
  scheduledCount: number;
};

type LocalReminderNotificationPayload = {
  itemId: string;
  notificationKind: "reminder";
  scheduledAtUtc: string;
  source: "recurring-item";
};

type ExistingLocalReminderNotification = {
  identifier: string;
  itemId: string;
  scheduledAtUtc: string;
};

function createLocalReminderIdentifier(params: {
  itemId: string;
  scheduledAtUtc: string;
  userId: string;
}): string {
  const { itemId, scheduledAtUtc, userId } = params;

  return `${LOCAL_REMINDER_IDENTIFIER_PREFIX}:${userId}:${itemId}:${scheduledAtUtc}`;
}

function createLocalReminderPayload(params: {
  itemId: string;
  scheduledAtUtc: string;
}): LocalReminderNotificationPayload {
  return {
    itemId: params.itemId,
    notificationKind: "reminder",
    scheduledAtUtc: params.scheduledAtUtc,
    source: "recurring-item",
  };
}

function parseLocalReminderIdentifier(
  identifier: string,
  userId: string
): ExistingLocalReminderNotification | null {
  const userPrefix = `${LOCAL_REMINDER_IDENTIFIER_PREFIX}:${userId}:`;

  if (!identifier.startsWith(userPrefix)) {
    return null;
  }

  const remainder = identifier.slice(userPrefix.length);
  const itemIdSeparatorIndex = remainder.indexOf(":");

  if (itemIdSeparatorIndex < 1) {
    return null;
  }

  const itemId = remainder.slice(0, itemIdSeparatorIndex);
  const scheduledAtUtc = remainder.slice(itemIdSeparatorIndex + 1);

  if (!itemId || !scheduledAtUtc) {
    return null;
  }

  return {
    identifier,
    itemId,
    scheduledAtUtc,
  };
}

function isWithinScope(
  notification: Pick<
    ExistingLocalReminderNotification,
    "itemId" | "scheduledAtUtc"
  >,
  scope: NotificationDeliverySyncScope
): boolean {
  if (scope.type === "all") {
    return true;
  }

  return (
    notification.itemId === scope.itemId &&
    notification.scheduledAtUtc >= scope.effectiveFromUtc
  );
}

function canScheduleItem(item: RecurringItem): boolean {
  return (
    !item.isArchived &&
    item.notificationsEnabled &&
    item.contentStatus?.status !== "unrecoverable"
  );
}

function createDesiredLocalReminderNotifications(params: {
  completionLogs: CompletionLog[];
  item: RecurringItem;
  rangeEndUtc: string;
  rangeStartUtc: string;
  timezone: string;
  userId: string;
}) {
  const { completionLogs, item, rangeEndUtc, rangeStartUtc, timezone, userId } =
    params;

  if (!canScheduleItem(item)) {
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
    .slice(0, 1)
    .map((occurrence) => ({
      body: formatUtcTimeInTimezone(occurrence.scheduledAtUtc, timezone),
      identifier: createLocalReminderIdentifier({
        itemId: item.id,
        scheduledAtUtc: occurrence.scheduledAtUtc,
        userId,
      }),
      itemId: item.id,
      payload: createLocalReminderPayload({
        itemId: item.id,
        scheduledAtUtc: occurrence.scheduledAtUtc,
      }),
      scheduledAtUtc: occurrence.scheduledAtUtc,
      title: item.title,
    }));
}

export async function syncLocalReminderNotifications(
  params: LocalReminderNotificationSyncParams
): Promise<LocalReminderNotificationSyncResult> {
  const { scope, timezone, userId } = params;
  const permission = await getNotificationPermissionState();

  if (permission.status !== "granted") {
    return {
      cancelledCount: 0,
      scheduledCount: 0,
    };
  }

  const now = new Date();
  const nowUtc = now.toISOString();
  const rangeEndUtc = addDays(now, 14).toISOString();
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
    createDesiredLocalReminderNotifications({
      completionLogs: completionLogsByItem[item.id] ?? [],
      item,
      rangeEndUtc,
      rangeStartUtc: nowUtc,
      timezone,
      userId,
    })
  );
  const scopedDesiredNotifications = desiredNotifications.filter(
    (notification) => isWithinScope(notification, scope)
  );

  const existingNotifications = (
    await Notifications.getAllScheduledNotificationsAsync()
  )
    .map((notification) =>
      parseLocalReminderIdentifier(notification.identifier, userId)
    )
    .filter((notification) => notification !== null)
    .filter((notification) => isWithinScope(notification, scope));
  const desiredIdentifiers = new Set(
    scopedDesiredNotifications.map((notification) => notification.identifier)
  );
  const existingIdentifiers = new Set(
    existingNotifications.map((notification) => notification.identifier)
  );
  const notificationsToCancel = existingNotifications.filter(
    (notification) => !desiredIdentifiers.has(notification.identifier)
  );
  const notificationsToSchedule = scopedDesiredNotifications.filter(
    (notification) => !existingIdentifiers.has(notification.identifier)
  );

  for (const notification of notificationsToCancel) {
    await Notifications.cancelScheduledNotificationAsync(
      notification.identifier
    );
  }

  for (const notification of notificationsToSchedule) {
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

  return {
    cancelledCount: notificationsToCancel.length,
    scheduledCount: notificationsToSchedule.length,
  };
}
