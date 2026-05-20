export type LocalReminderNotificationPayload = {
  notificationKind: "reminder";
  source: "recurring-item";
};

export function createLocalReminderPayload(): LocalReminderNotificationPayload {
  return {
    notificationKind: "reminder",
    source: "recurring-item",
  };
}

export function isLocalReminderNotificationPayload(
  value: unknown
): value is LocalReminderNotificationPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.notificationKind === "reminder" &&
    candidate.source === "recurring-item"
  );
}
