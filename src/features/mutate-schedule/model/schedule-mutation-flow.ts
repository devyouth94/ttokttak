import type { RecurringItem } from "~/entities/schedule";
import {
  archiveRecurringItem,
  type ArchiveRecurringItemOptions,
  createRecurringItem,
  type CreateRecurringItemInput,
  updateRecurringItem,
  type UpdateRecurringItemInput,
} from "~/entities/schedule/api";
import { invalidateScheduleReadQueries } from "~/features/read-schedule";
import type {
  NotificationSyncReason,
  NotificationSyncScope,
} from "~/features/sync-local-notifications";
import { syncLocalReminderNotifications } from "~/features/sync-local-notifications";
import { captureException } from "~/sentry";
import type { AppLanguage } from "~/shared/i18n";
import { queryClient } from "~/shared/lib/query/query-client";

type ScheduleMutationReason = Extract<
  NotificationSyncReason,
  "item-archived" | "item-created" | "item-updated"
>;

type CompleteScheduleMutationInput = {
  language: AppLanguage;
  reason: ScheduleMutationReason;
  scope: NotificationSyncScope;
  timezone: string;
  userId: string;
};

export type CreateScheduleInput = {
  createItem?: (input: CreateRecurringItemInput) => Promise<RecurringItem>;
  draft: Omit<CreateRecurringItemInput, "userId">;
  language: AppLanguage;
  now?: () => Date;
  userId: string;
};

export type UpdateScheduleInput = {
  itemId: string;
  language: AppLanguage;
  now?: () => Date;
  patch: UpdateRecurringItemInput["patch"];
  timezone: string;
  updateItem?: (input: UpdateRecurringItemInput) => Promise<RecurringItem>;
  userId: string;
};

export type ArchiveScheduleInput = {
  archiveItem?: (input: ArchiveRecurringItemOptions) => Promise<void>;
  itemId: string;
  language: AppLanguage;
  now?: () => Date;
  timezone: string;
  userId: string;
};

function createScheduleMutationScope(params: {
  itemId: string;
  syncScopeStartedAtUtc: string;
}): NotificationSyncScope {
  return {
    effectiveFromUtc: params.syncScopeStartedAtUtc,
    itemId: params.itemId,
    type: "item",
  };
}

async function completeScheduleMutation({
  language,
  reason,
  scope,
  timezone,
  userId,
}: CompleteScheduleMutationInput): Promise<void> {
  try {
    await syncLocalReminderNotifications({
      language,
      reason,
      scope,
      timezone,
      userId,
    });
  } catch (error) {
    captureException(error, {
      tags: {
        feature: "schedule-mutation-notification-sync",
        reason,
      },
    });
  }

  await invalidateScheduleReadQueries(queryClient, userId);
}

export async function createSchedule({
  createItem = createRecurringItem,
  draft,
  language,
  now = () => new Date(),
  userId,
}: CreateScheduleInput): Promise<RecurringItem> {
  const syncScopeStartedAtUtc = now().toISOString();
  const createdItem = await createItem({
    ...draft,
    userId,
  });

  await completeScheduleMutation({
    language,
    reason: "item-created",
    scope: createScheduleMutationScope({
      itemId: createdItem.id,
      syncScopeStartedAtUtc,
    }),
    timezone: draft.timezone,
    userId,
  });

  return createdItem;
}

export async function updateSchedule({
  itemId,
  language,
  now = () => new Date(),
  patch,
  timezone,
  updateItem = updateRecurringItem,
  userId,
}: UpdateScheduleInput): Promise<RecurringItem> {
  const syncScopeStartedAtUtc = now().toISOString();
  const updatedItem = await updateItem({
    id: itemId,
    patch,
    timezone,
    userId,
  });

  await completeScheduleMutation({
    language,
    reason: "item-updated",
    scope: createScheduleMutationScope({
      itemId,
      syncScopeStartedAtUtc,
    }),
    timezone,
    userId,
  });

  return updatedItem;
}

export async function archiveSchedule({
  archiveItem = archiveRecurringItem,
  itemId,
  language,
  now = () => new Date(),
  timezone,
  userId,
}: ArchiveScheduleInput): Promise<void> {
  const syncScopeStartedAtUtc = now().toISOString();

  await archiveItem({
    id: itemId,
    userId,
  });

  await completeScheduleMutation({
    language,
    reason: "item-archived",
    scope: createScheduleMutationScope({
      itemId,
      syncScopeStartedAtUtc,
    }),
    timezone,
    userId,
  });
}
