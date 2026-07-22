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
import { captureException } from "~/sentry";
import { queryClient } from "~/shared/lib/query/query-client";

type CompleteScheduleMutationInput = {
  syncNotifications: () => Promise<void>;
  userId: string;
};

export type CreateScheduleInput = {
  createItem?: (input: CreateRecurringItemInput) => Promise<RecurringItem>;
  draft: Omit<CreateRecurringItemInput, "userId">;
  syncNotifications: () => Promise<void>;
  userId: string;
};

export type UpdateScheduleInput = {
  itemId: string;
  patch: UpdateRecurringItemInput["patch"];
  syncNotifications: () => Promise<void>;
  timezone: string;
  updateItem?: (input: UpdateRecurringItemInput) => Promise<RecurringItem>;
  userId: string;
};

export type ArchiveScheduleInput = {
  archiveItem?: (input: ArchiveRecurringItemOptions) => Promise<void>;
  itemId: string;
  syncNotifications: () => Promise<void>;
  userId: string;
};

async function completeScheduleMutation({
  syncNotifications,
  userId,
}: CompleteScheduleMutationInput): Promise<void> {
  try {
    await syncNotifications();
  } catch (error) {
    captureException(error, {
      tags: { feature: "schedule-mutation-notification-sync" },
    });
  }

  await invalidateScheduleReadQueries(queryClient, userId);
}

export async function createSchedule({
  createItem = createRecurringItem,
  draft,
  syncNotifications,
  userId,
}: CreateScheduleInput): Promise<RecurringItem> {
  const createdItem = await createItem({
    ...draft,
    userId,
  });

  await completeScheduleMutation({
    syncNotifications,
    userId,
  });

  return createdItem;
}

export async function updateSchedule({
  itemId,
  patch,
  syncNotifications,
  timezone,
  updateItem = updateRecurringItem,
  userId,
}: UpdateScheduleInput): Promise<RecurringItem> {
  const updatedItem = await updateItem({
    id: itemId,
    patch,
    timezone,
    userId,
  });

  await completeScheduleMutation({
    syncNotifications,
    userId,
  });

  return updatedItem;
}

export async function archiveSchedule({
  archiveItem = archiveRecurringItem,
  itemId,
  syncNotifications,
  userId,
}: ArchiveScheduleInput): Promise<void> {
  await archiveItem({
    id: itemId,
    userId,
  });

  await completeScheduleMutation({
    syncNotifications,
    userId,
  });
}
