import * as Notifications from "expo-notifications";
import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

import { getNotificationPermissionState } from "~/features/notifications/notification-permission";
import type {
  NotificationSyncReason,
  NotificationSyncScope,
} from "~/features/notifications/notification-sync.types";
import {
  getNextOccurrence,
  getOccurrencesInRange,
} from "~/features/recurring/domain/occurrence";
import type {
  CompletionLog,
  DerivedOccurrence,
  RecurringItem,
} from "~/features/recurring/domain/types";
import { completionBasedRecurrenceTypes } from "~/features/recurring/domain/types";
import { listCompletionLogs } from "~/features/recurring/repositories/completion-logs-repository";
import { listRecurringItems } from "~/features/recurring/repositories/recurring-items-repository";
import { formatUtcTimeInTimezone } from "~/features/recurring/utils/recurring-display";

const REMINDER_NOTIFICATION_CHANNEL_ID = "reminders";
const LOCAL_REMINDER_IDENTIFIER_PREFIX = "ttokttak:reminder";
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

type LocalReminderNotificationPayload = {
  notificationKind: "reminder";
  source: "recurring-item";
};

type ExistingLocalReminderNotification = {
  identifier: string;
  itemId: string;
  scheduledAtUtc: string;
};

type DesiredLocalReminderNotification = {
  body: string;
  identifier: string;
  itemId: string;
  payload: LocalReminderNotificationPayload;
  scheduledAtUtc: string;
  title: string;
};

type LocalReminderNotificationSyncPlan = {
  diagnostics: LocalReminderNotificationSyncResult["diagnostics"];
  notificationsToCancel: ExistingLocalReminderNotification[];
  notificationsToSchedule: DesiredLocalReminderNotification[];
};

function createLocalReminderIdentifier(params: {
  itemId: string;
  scheduledAtUtc: string;
  userId: string;
}): string {
  const { itemId, scheduledAtUtc, userId } = params;

  return `${LOCAL_REMINDER_IDENTIFIER_PREFIX}:${userId}:${itemId}:${scheduledAtUtc}`;
}

function createLocalReminderPayload(): LocalReminderNotificationPayload {
  return {
    notificationKind: "reminder",
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

function isTtokttakLocalReminderIdentifier(identifier: string): boolean {
  return identifier.startsWith(`${LOCAL_REMINDER_IDENTIFIER_PREFIX}:`);
}

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

function canScheduleItem(item: RecurringItem): boolean {
  return (
    !item.isArchived &&
    item.notificationsEnabled &&
    item.contentStatus?.status !== "unrecoverable"
  );
}

function isCompletionBasedItem(item: RecurringItem): boolean {
  return (
    item.anchorType === "completion_based" &&
    completionBasedRecurrenceTypes.includes(
      item.recurrenceType as (typeof completionBasedRecurrenceTypes)[number]
    )
  );
}

function hasUnresolvedCompletionBasedOccurrence(params: {
  completionLogs: CompletionLog[];
  item: RecurringItem;
  nowUtc: string;
  timezone: string;
}): boolean {
  const { completionLogs, item, nowUtc, timezone } = params;

  if (!isCompletionBasedItem(item)) {
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

function toDesiredLocalReminderNotification(params: {
  item: RecurringItem;
  occurrence: DerivedOccurrence;
  timezone: string;
  userId: string;
}): DesiredLocalReminderNotification {
  const { item, occurrence, timezone, userId } = params;

  return {
    body: formatUtcTimeInTimezone(occurrence.scheduledAtUtc, timezone),
    identifier: createLocalReminderIdentifier({
      itemId: item.id,
      scheduledAtUtc: occurrence.scheduledAtUtc,
      userId,
    }),
    itemId: item.id,
    payload: createLocalReminderPayload(),
    scheduledAtUtc: occurrence.scheduledAtUtc,
    title: item.title,
  };
}

function dedupeDesiredNotifications(
  notifications: DesiredLocalReminderNotification[]
): DesiredLocalReminderNotification[] {
  const notificationsByIdentifier = new Map<
    string,
    DesiredLocalReminderNotification
  >();

  for (const notification of notifications) {
    notificationsByIdentifier.set(notification.identifier, notification);
  }

  return Array.from(notificationsByIdentifier.values());
}

function groupCompletionLogsByItemId(
  completionLogs: CompletionLog[]
): Record<string, CompletionLog[]> {
  return completionLogs.reduce<Record<string, CompletionLog[]>>(
    (accumulator, log) => {
      const currentLogs = accumulator[log.itemId] ?? [];

      currentLogs.push(log);
      accumulator[log.itemId] = currentLogs;

      return accumulator;
    },
    {}
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

  if (
    hasUnresolvedCompletionBasedOccurrence({
      completionLogs,
      item,
      nowUtc: rangeStartUtc,
      timezone,
    })
  ) {
    return [];
  }

  const rangeOccurrences = getOccurrencesInRange(
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
  const candidateOccurrences = nextOccurrence
    ? [...rangeOccurrences, nextOccurrence]
    : rangeOccurrences;

  return dedupeDesiredNotifications(
    candidateOccurrences.map((occurrence) =>
      toDesiredLocalReminderNotification({
        item,
        occurrence,
        timezone,
        userId,
      })
    )
  );
}

export function createLocalReminderNotificationCandidates(params: {
  completionLogs: CompletionLog[];
  items: RecurringItem[];
  rangeEndUtc: string;
  rangeStartUtc: string;
  timezone: string;
  userId: string;
}): DesiredLocalReminderNotification[] {
  const {
    completionLogs,
    items,
    rangeEndUtc,
    rangeStartUtc,
    timezone,
    userId,
  } = params;
  const completionLogsByItem = groupCompletionLogsByItemId(completionLogs);

  return items.flatMap((item) =>
    createDesiredLocalReminderNotifications({
      completionLogs: completionLogsByItem[item.id] ?? [],
      item,
      rangeEndUtc,
      rangeStartUtc,
      timezone,
      userId,
    })
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
  const nowUtc = now.toISOString();
  const rangeEndUtc = addDays(now, 30).toISOString();
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
  const desiredNotifications = createLocalReminderNotificationCandidates({
    completionLogs,
    items,
    rangeEndUtc,
    rangeStartUtc: nowUtc,
    timezone,
    userId,
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
