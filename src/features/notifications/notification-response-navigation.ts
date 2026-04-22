import * as Notifications from "expo-notifications";
import { router } from "expo-router";

type ReminderNotificationPayload = {
  itemId: string;
  scheduledAtUtc: string;
  source: "recurring-item";
};

function isReminderNotificationPayload(
  value: unknown
): value is ReminderNotificationPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
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

  router.push({
    params: {
      itemId: payload.itemId,
      scheduledAtUtc: payload.scheduledAtUtc,
    },
    pathname: "/items/[itemId]",
  });

  return true;
}
