export type NotificationSyncReason =
  | "app-start"
  | "item-archived"
  | "item-created"
  | "item-updated"
  | "occurrence-completed"
  | "occurrence-skipped"
  | "session-restored";

export type NotificationSyncScope =
  | {
      type: "all";
    }
  | {
      effectiveFromUtc: string;
      itemId: string;
      type: "item";
    };

export type ExistingScheduledNotification = {
  body: string;
  identifier: string;
  itemId: string;
  scheduledAtUtc: string;
  title: string;
};

export type DesiredScheduledNotification = {
  body: string;
  itemId: string;
  scheduledAtUtc: string;
  title: string;
};

function isWithinScope(
  notification: Pick<
    ExistingScheduledNotification,
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

function getNotificationIdentity(notification: {
  itemId: string;
  scheduledAtUtc: string;
}): string {
  return `${notification.itemId}:${notification.scheduledAtUtc}`;
}

export function createNotificationSyncPlan(params: {
  desired: DesiredScheduledNotification[];
  existing: ExistingScheduledNotification[];
  scope: NotificationSyncScope;
}): {
  notificationsToCancel: ExistingScheduledNotification[];
  notificationsToKeep: ExistingScheduledNotification[];
  notificationsToSchedule: DesiredScheduledNotification[];
} {
  const { desired, existing, scope } = params;
  const desiredMap = new Map(
    desired
      .filter((notification) => isWithinScope(notification, scope))
      .map((notification) => [
        getNotificationIdentity(notification),
        notification,
      ])
  );
  const notificationsToCancel: ExistingScheduledNotification[] = [];
  const notificationsToKeep: ExistingScheduledNotification[] = [];

  for (const scheduledNotification of existing) {
    if (!isWithinScope(scheduledNotification, scope)) {
      notificationsToKeep.push(scheduledNotification);
      continue;
    }

    const desiredNotification = desiredMap.get(
      getNotificationIdentity(scheduledNotification)
    );

    if (
      desiredNotification &&
      desiredNotification.title === scheduledNotification.title &&
      desiredNotification.body === scheduledNotification.body
    ) {
      notificationsToKeep.push(scheduledNotification);
      desiredMap.delete(getNotificationIdentity(scheduledNotification));
      continue;
    }

    notificationsToCancel.push(scheduledNotification);
  }

  return {
    notificationsToCancel,
    notificationsToKeep,
    notificationsToSchedule: Array.from(desiredMap.values()),
  };
}
