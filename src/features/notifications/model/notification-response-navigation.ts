import {
  defaultNotificationActionIdentifier,
  isLocalReminderNotificationPayload,
  type LocalNotificationResponse,
  type LocalReminderNotificationPayload,
} from "~/shared/lib/notifications";

function extractPayloadCandidate(
  response: LocalNotificationResponse
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
  response: LocalNotificationResponse
): LocalReminderNotificationPayload | null {
  for (const candidate of extractPayloadCandidate(response)) {
    if (isLocalReminderNotificationPayload(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function getNotificationNavigationKey(
  response: LocalNotificationResponse
): string {
  return response.notification.request.identifier;
}

export function shouldNavigateHomeFromNotificationResponse(
  response: LocalNotificationResponse
): boolean {
  if (response.actionIdentifier !== defaultNotificationActionIdentifier) {
    return false;
  }

  const payload = resolveReminderNotificationPayload(response);

  return payload !== null;
}
