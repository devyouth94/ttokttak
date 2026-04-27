import type {
  NotificationDeliveryAttempt,
  NotificationDeliveryAttemptStatus,
  NotificationDeliveryJob,
  NotificationDeliveryJobCancelReason,
  NotificationKind,
} from "~/features/recurring/domain/types";
import {
  getRepositoryClient,
  type RepositoryClient,
} from "~/features/recurring/repositories/repository-client";
import type {
  NotificationDeliveryJobInsert,
  NotificationDeliveryJobRow,
} from "~/lib/database.types";

export type UpsertNotificationDeliveryJobInput = {
  body: string;
  dedupeKey: string;
  deliverAtUtc: string;
  itemId: string;
  itemScheduledAtUtc: string;
  notificationKind: NotificationKind;
  payload: Record<string, unknown>;
  title: string;
  userId: string;
};

export type ListNotificationDeliveryJobsOptions = {
  client?: RepositoryClient;
  itemIds?: string[];
  rangeEndUtc?: string;
  rangeStartUtc?: string;
  statuses?: NotificationDeliveryJob["status"][];
  userId: string;
};

export type CancelNotificationDeliveryJobsOptions = {
  cancelReason: NotificationDeliveryJobCancelReason;
  client?: RepositoryClient;
  jobIds: string[];
  userId: string;
};

function toNotificationDeliveryJob(
  row: NotificationDeliveryJobRow
): NotificationDeliveryJob {
  return {
    body: row.body,
    cancelReason: row.cancel_reason as NotificationDeliveryJob["cancelReason"],
    cancelledAt: row.cancelled_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    dedupeKey: row.dedupe_key,
    deliverAtUtc: row.deliver_at_utc,
    failureCount: row.failure_count,
    id: row.id,
    itemId: row.item_id,
    itemScheduledAtUtc: row.item_scheduled_at_utc,
    lastAttemptedAt: row.last_attempted_at,
    nextRetryAt: row.next_retry_at,
    notificationKind: row.notification_kind as NotificationKind,
    payload: row.payload,
    retryCount: row.retry_count,
    status: row.status as NotificationDeliveryJob["status"],
    successCount: row.success_count,
    targetTokenCount: row.target_token_count,
    title: row.title,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

function toNotificationDeliveryJobInsert(
  input: UpsertNotificationDeliveryJobInput
): NotificationDeliveryJobInsert {
  return {
    body: input.body,
    cancel_reason: null,
    cancelled_at: null,
    completed_at: null,
    dedupe_key: input.dedupeKey,
    deliver_at_utc: input.deliverAtUtc,
    failure_count: 0,
    item_id: input.itemId,
    item_scheduled_at_utc: input.itemScheduledAtUtc,
    last_attempted_at: null,
    next_retry_at: null,
    notification_kind: input.notificationKind,
    payload: input.payload,
    retry_count: 0,
    status: "pending",
    success_count: 0,
    target_token_count: 0,
    title: input.title,
    user_id: input.userId,
  };
}

export async function listNotificationDeliveryJobs({
  client,
  itemIds,
  rangeEndUtc,
  rangeStartUtc,
  statuses,
  userId,
}: ListNotificationDeliveryJobsOptions): Promise<NotificationDeliveryJob[]> {
  const supabase = getRepositoryClient(client);
  let query = supabase
    .from("notification_delivery_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("deliver_at_utc", { ascending: true });

  if (rangeStartUtc) {
    query = query.gte("item_scheduled_at_utc", rangeStartUtc);
  }

  if (rangeEndUtc) {
    query = query.lte("item_scheduled_at_utc", rangeEndUtc);
  }

  if (itemIds && itemIds.length > 0) {
    query = query.in("item_id", itemIds);
  }

  if (statuses && statuses.length > 0) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data.map(toNotificationDeliveryJob);
}

export async function upsertNotificationDeliveryJobs(
  inputs: UpsertNotificationDeliveryJobInput[],
  client?: RepositoryClient
): Promise<NotificationDeliveryJob[]> {
  if (inputs.length === 0) {
    return [];
  }

  const supabase = getRepositoryClient(client);
  const { data, error } = await supabase.rpc(
    "upsert_notification_delivery_jobs",
    {
      p_jobs: inputs.map(toNotificationDeliveryJobInsert),
    }
  );

  if (error) {
    throw error;
  }

  return data.map(toNotificationDeliveryJob);
}

export async function cancelNotificationDeliveryJobs({
  cancelReason,
  client,
  jobIds,
}: CancelNotificationDeliveryJobsOptions): Promise<void> {
  if (jobIds.length === 0) {
    return;
  }

  const supabase = getRepositoryClient(client);
  const { error } = await supabase.rpc("cancel_notification_delivery_jobs", {
    p_cancel_reason: cancelReason,
    p_job_ids: jobIds,
  });

  if (error) {
    throw error;
  }
}

export function isRetryableNotificationDeliveryAttemptStatus(
  status: NotificationDeliveryAttemptStatus
): boolean {
  return status === "retryable-failed";
}

export type NotificationDeliveryAttemptSummary = Pick<
  NotificationDeliveryAttempt,
  "attemptNumber" | "status"
>;
