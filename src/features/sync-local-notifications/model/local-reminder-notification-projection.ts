import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

import type {
  CompletionLog,
  DerivedOccurrence,
  RecurringItem,
} from "~/entities/schedule";
import {
  completionBasedRecurrenceTypes,
  formatUtcTimeInTimezone,
  getCurrentScheduleVersion,
  getNextOccurrence,
  getOccurrencesInRange,
} from "~/entities/schedule";
import type { AppLanguage } from "~/shared/i18n";
import { createLocalReminderIdentifier } from "~/shared/lib/notifications/local-reminder-identifier";
import {
  createLocalReminderPayload,
  type LocalReminderNotificationPayload,
} from "~/shared/lib/notifications/local-reminder-payload";

export type DesiredLocalReminderNotification = {
  body: string;
  identifier: string;
  itemId: string;
  payload: LocalReminderNotificationPayload;
  scheduledAtUtc: string;
  title: string;
};

export type ExistingLocalReminderNotification = {
  body: string | null;
  identifier: string;
  itemId: string;
  scheduledAtUtc: string;
  title: string | null;
};

type LocalReminderNotificationProjection = {
  notifications: DesiredLocalReminderNotification[];
};

function canScheduleItem(item: RecurringItem): boolean {
  return (
    !item.isArchived &&
    getCurrentScheduleVersion(item).notificationsEnabled &&
    item.contentStatus?.status !== "unrecoverable"
  );
}

function isCompletionBasedItem(item: RecurringItem): boolean {
  const schedule = getCurrentScheduleVersion(item);

  return (
    schedule.anchorType === "completion_based" &&
    completionBasedRecurrenceTypes.includes(
      schedule.recurrenceType as (typeof completionBasedRecurrenceTypes)[number]
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
  language: AppLanguage;
  occurrence: DerivedOccurrence;
  timezone: string;
  userId: string;
}): DesiredLocalReminderNotification {
  const { item, language, occurrence, timezone, userId } = params;

  return {
    body: formatUtcTimeInTimezone(
      occurrence.scheduledAtUtc,
      timezone,
      language
    ),
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
  language: AppLanguage;
  rangeEndUtc: string;
  rangeStartUtc: string;
  timezone: string;
  userId: string;
}) {
  const {
    completionLogs,
    item,
    language,
    rangeEndUtc,
    rangeStartUtc,
    timezone,
    userId,
  } = params;

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
        language,
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
  language: AppLanguage;
  now: Date;
  timezone: string;
  userId: string;
}): LocalReminderNotificationProjection {
  const { completionLogs, items, language, now, timezone, userId } = params;
  const rangeStartUtc = now.toISOString();
  const rangeEndUtc = addDays(now, 30).toISOString();
  const completionLogsByItem = groupCompletionLogsByItemId(completionLogs);

  return {
    notifications: items.flatMap((item) =>
      createDesiredLocalReminderNotifications({
        completionLogs: completionLogsByItem[item.id] ?? [],
        item,
        language,
        rangeEndUtc,
        rangeStartUtc,
        timezone,
        userId,
      })
    ),
  };
}
