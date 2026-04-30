import { addDays } from "date-fns";

import { createNotificationDeliveryPlan } from "~/features/notifications/notification-delivery-sync.helpers";
import type {
  NotificationDeliverySyncReason,
  NotificationDeliverySyncScope,
} from "~/features/notifications/notification-delivery-sync.types";
import { getOccurrencesInRange } from "~/features/recurring/domain/occurrence";
import type {
  CompletionLog,
  NotificationDeliveryJobCancelReason,
  RecurringItem,
} from "~/features/recurring/domain/types";
import { listCompletionLogs } from "~/features/recurring/repositories/completion-logs-repository";
import {
  cancelNotificationDeliveryJobs,
  listNotificationDeliveryJobs,
  upsertNotificationDeliveryJobs,
} from "~/features/recurring/repositories/notification-delivery-jobs-repository";
import { listRecurringItems } from "~/features/recurring/repositories/recurring-items-repository";

type NotificationDeliverySyncParams = {
  reason: NotificationDeliverySyncReason;
  scope: NotificationDeliverySyncScope;
  timezone: string;
  userId: string;
};

type NotificationDeliverySyncResult = {
  cancelledCount: number;
  scheduledCount: number;
};

function createRemotePushBody(item: RecurringItem): string {
  return item.description?.trim() ?? "";
}

function createRemotePushTitle(item: RecurringItem): string {
  return item.title;
}

function createNotificationJobDedupeKey(params: {
  itemId: string;
  scheduledAtUtc: string;
  userId: string;
}): string {
  const { itemId, scheduledAtUtc, userId } = params;

  return `reminder:${userId}:${itemId}:${scheduledAtUtc}`;
}

function resolveCancelReason(
  reason: NotificationDeliverySyncParams["reason"]
): NotificationDeliveryJobCancelReason {
  switch (reason) {
    case "item-archived":
      return "item-archived";
    case "item-created":
      return "schedule-updated";
    case "item-updated":
      return "schedule-updated";
    case "occurrence-completed":
      return "occurrence-completed";
    case "occurrence-skipped":
      return "occurrence-skipped";
  }
}

function createDesiredNotificationDeliveryJobs(params: {
  completionLogs: CompletionLog[];
  item: RecurringItem;
  rangeEndUtc: string;
  rangeStartUtc: string;
  userId: string;
  timezone: string;
}) {
  const { completionLogs, item, rangeEndUtc, rangeStartUtc, timezone, userId } =
    params;

  if (item.isArchived || !item.notificationsEnabled) {
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
    .map((occurrence) => ({
      body: createRemotePushBody(item),
      dedupeKey: createNotificationJobDedupeKey({
        itemId: item.id,
        scheduledAtUtc: occurrence.scheduledAtUtc,
        userId,
      }),
      deliverAtUtc: occurrence.scheduledAtUtc,
      itemId: item.id,
      itemScheduledAtUtc: occurrence.scheduledAtUtc,
      notificationKind: "reminder" as const,
      payload: {
        itemId: item.id,
        notificationKind: "reminder",
        scheduledAtUtc: occurrence.scheduledAtUtc,
        source: "recurring-item",
      },
      title: createRemotePushTitle(item),
    }));
}

function getExistingJobRangeStartUtc(
  scope: NotificationDeliverySyncScope,
  nowUtc: string
): string {
  if (scope.type === "all") {
    return nowUtc;
  }

  return scope.effectiveFromUtc;
}

export async function syncRemoteNotificationDeliveryJobs(
  params: NotificationDeliverySyncParams
): Promise<NotificationDeliverySyncResult> {
  const { reason, scope, timezone, userId } = params;
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
  const desiredJobs = items.flatMap((item) =>
    createDesiredNotificationDeliveryJobs({
      completionLogs: completionLogsByItem[item.id] ?? [],
      item,
      rangeEndUtc,
      rangeStartUtc: nowUtc,
      timezone,
      userId,
    })
  );
  const existingJobs = await listNotificationDeliveryJobs({
    itemIds: scope.type === "item" ? [scope.itemId] : undefined,
    rangeEndUtc,
    rangeStartUtc: getExistingJobRangeStartUtc(scope, nowUtc),
    statuses: ["pending", "processing", "retrying"],
    userId,
  });
  const plan = createNotificationDeliveryPlan({
    desired: desiredJobs,
    existing: existingJobs,
    scope,
  });

  if (plan.jobsToCancel.length > 0) {
    await cancelNotificationDeliveryJobs({
      cancelReason: resolveCancelReason(reason),
      jobIds: plan.jobsToCancel.map((job) => job.id),
      userId,
    });
  }

  if (plan.jobsToUpsert.length > 0) {
    await upsertNotificationDeliveryJobs(
      plan.jobsToUpsert.map((job) => ({
        body: job.body,
        dedupeKey: job.dedupeKey,
        deliverAtUtc: job.deliverAtUtc,
        itemId: job.itemId,
        itemScheduledAtUtc: job.itemScheduledAtUtc,
        notificationKind: job.notificationKind,
        payload: job.payload,
        title: job.title,
        userId,
      }))
    );
  }

  return {
    cancelledCount: plan.jobsToCancel.length,
    scheduledCount: plan.jobsToUpsert.length,
  };
}
