import type { NotificationDeliverySyncScope } from "~/features/notifications/notification-delivery-sync.types";
import type {
  NotificationDeliveryJob,
  NotificationKind,
} from "~/features/recurring/domain/types";

export type ExistingNotificationDeliveryJob = Pick<
  NotificationDeliveryJob,
  | "body"
  | "dedupeKey"
  | "id"
  | "itemId"
  | "itemScheduledAtUtc"
  | "notificationKind"
  | "payload"
  | "title"
>;

export type DesiredNotificationDeliveryJob = {
  body: string;
  dedupeKey: string;
  deliverAtUtc: string;
  itemId: string;
  itemScheduledAtUtc: string;
  notificationKind: NotificationKind;
  payload: Record<string, unknown>;
  title: string;
};

function isWithinScope(
  job: Pick<ExistingNotificationDeliveryJob, "itemId" | "itemScheduledAtUtc">,
  scope: NotificationDeliverySyncScope
): boolean {
  if (scope.type === "all") {
    return true;
  }

  return (
    job.itemId === scope.itemId &&
    job.itemScheduledAtUtc >= scope.effectiveFromUtc
  );
}

function getNotificationJobIdentity(job: {
  itemId: string;
  itemScheduledAtUtc: string;
  notificationKind: NotificationKind;
}): string {
  return `${job.notificationKind}:${job.itemId}:${job.itemScheduledAtUtc}`;
}

function normalizePayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload);
}

export function createNotificationDeliveryPlan(params: {
  desired: DesiredNotificationDeliveryJob[];
  existing: ExistingNotificationDeliveryJob[];
  scope: NotificationDeliverySyncScope;
}): {
  jobsToCancel: ExistingNotificationDeliveryJob[];
  jobsToKeep: ExistingNotificationDeliveryJob[];
  jobsToUpsert: DesiredNotificationDeliveryJob[];
} {
  const { desired, existing, scope } = params;
  const desiredMap = new Map(
    desired
      .filter((job) => isWithinScope(job, scope))
      .map((job) => [getNotificationJobIdentity(job), job])
  );
  const jobsToCancel: ExistingNotificationDeliveryJob[] = [];
  const jobsToKeep: ExistingNotificationDeliveryJob[] = [];

  for (const existingJob of existing) {
    if (!isWithinScope(existingJob, scope)) {
      jobsToKeep.push(existingJob);
      continue;
    }

    const desiredJob = desiredMap.get(getNotificationJobIdentity(existingJob));

    if (
      desiredJob &&
      desiredJob.dedupeKey === existingJob.dedupeKey &&
      desiredJob.title === existingJob.title &&
      desiredJob.body === existingJob.body &&
      normalizePayload(desiredJob.payload) ===
        normalizePayload(existingJob.payload)
    ) {
      jobsToKeep.push(existingJob);
      desiredMap.delete(getNotificationJobIdentity(existingJob));
      continue;
    }

    jobsToCancel.push(existingJob);
  }

  return {
    jobsToCancel,
    jobsToKeep,
    jobsToUpsert: Array.from(desiredMap.values()),
  };
}
