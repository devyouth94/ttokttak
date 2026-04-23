import * as Notifications from "expo-notifications";
import { router } from "expo-router";

type ReminderNotificationPayload = {
  itemId: string;
  notificationKind: "reminder";
  scheduledAtUtc: string;
  source: "recurring-item";
};

type NotificationInboxNavigationItem = {
  itemId: string;
  itemScheduledAtUtc: string;
  notificationKind: string;
  payload: Record<string, unknown>;
};

function isReminderNotificationPayload(
  value: unknown
): value is ReminderNotificationPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.notificationKind === "reminder" &&
    candidate.source === "recurring-item" &&
    typeof candidate.itemId === "string" &&
    typeof candidate.scheduledAtUtc === "string"
  );
}

function extractPayloadCandidate(
  response: Notifications.NotificationResponse
): unknown[] {
  const candidates: unknown[] = [response.notification.request.content.data];
  const trigger = response.notification.request.trigger;

  if (!trigger || typeof trigger !== "object" || !("type" in trigger)) {
    return candidates;
  }

  if (trigger.type !== "push") {
    return candidates;
  }

  if ("payload" in trigger) {
    candidates.push(trigger.payload);
  }

  if ("remoteMessage" in trigger) {
    candidates.push(trigger.remoteMessage?.data);
  }

  return candidates;
}

function resolveReminderNotificationPayload(
  response: Notifications.NotificationResponse
): ReminderNotificationPayload | null {
  for (const candidate of extractPayloadCandidate(response)) {
    if (isReminderNotificationPayload(candidate)) {
      return candidate;
    }
  }

  return null;
}

function navigateToReminderDetail(
  payload: ReminderNotificationPayload,
  returnTo: string
): void {
  router.push({
    params: {
      itemId: payload.itemId,
      returnTo,
      scheduledAtUtc: payload.scheduledAtUtc,
    },
    pathname: "/items/[itemId]",
  });
}

function isSameUtcInstant(left: string, right: string): boolean {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();

  return (
    Number.isFinite(leftTime) &&
    Number.isFinite(rightTime) &&
    leftTime === rightTime
  );
}

export function getNotificationNavigationKey(
  response: Notifications.NotificationResponse
): string {
  return response.notification.request.identifier;
}

export function navigateFromNotificationResponse(
  response: Notifications.NotificationResponse
): boolean {
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return false;
  }

  const payload = resolveReminderNotificationPayload(response);

  if (!payload) {
    return false;
  }

  navigateToReminderDetail(payload, "/home");

  return true;
}

export function navigateFromNotificationInboxItem(
  item: NotificationInboxNavigationItem
): boolean {
  if (item.notificationKind !== "reminder") {
    return false;
  }

  const payload = item.payload;

  if (isReminderNotificationPayload(payload)) {
    if (item.itemId !== payload.itemId) {
      return false;
    }

    if (!isSameUtcInstant(item.itemScheduledAtUtc, payload.scheduledAtUtc)) {
      return false;
    }

    navigateToReminderDetail(payload, "/(tabs)/home/notifications");

    return true;
  }

  navigateToReminderDetail(
    {
      itemId: item.itemId,
      notificationKind: "reminder",
      scheduledAtUtc: item.itemScheduledAtUtc,
      source: "recurring-item",
    },
    "/(tabs)/home/notifications"
  );

  return true;
}
