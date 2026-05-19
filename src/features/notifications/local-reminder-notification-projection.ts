import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

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
import { formatUtcTimeInTimezone } from "~/features/recurring/utils/recurring-display";

const LOCAL_REMINDER_IDENTIFIER_PREFIX = "ttokttak:reminder";

type LocalReminderNotificationPayload = {
  notificationKind: "reminder";
  source: "recurring-item";
};

export type DesiredLocalReminderNotification = {
  body: string;
  identifier: string;
  itemId: string;
  payload: LocalReminderNotificationPayload;
  scheduledAtUtc: string;
  title: string;
};

export type ExistingLocalReminderNotification = {
  identifier: string;
  itemId: string;
  scheduledAtUtc: string;
};

type LocalReminderNotificationProjection = {
  notifications: DesiredLocalReminderNotification[];
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

export function parseLocalReminderIdentifier(
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

export function isTtokttakLocalReminderIdentifier(identifier: string): boolean {
  return identifier.startsWith(`${LOCAL_REMINDER_IDENTIFIER_PREFIX}:`);
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

export function createLocalReminderNotificationProjection(params: {
  completionLogs: CompletionLog[];
  items: RecurringItem[];
  now: Date;
  timezone: string;
  userId: string;
}): LocalReminderNotificationProjection {
  const { completionLogs, items, now, timezone, userId } = params;
  const rangeStartUtc = now.toISOString();
  const rangeEndUtc = addDays(now, 30).toISOString();
  const completionLogsByItem = groupCompletionLogsByItemId(completionLogs);

  return {
    notifications: items.flatMap((item) =>
      createDesiredLocalReminderNotifications({
        completionLogs: completionLogsByItem[item.id] ?? [],
        item,
        rangeEndUtc,
        rangeStartUtc,
        timezone,
        userId,
      })
    ),
  };
}
