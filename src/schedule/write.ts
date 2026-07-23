import { captureException } from "~/sentry";

import * as db from "./db/items";
import { refreshSchedules } from "./query";
import type { EditScheduleInput } from "./rules/edit";
import type { CreateScheduleInput, Schedule } from "./schedule";

type CommonOptions = {
  syncNotifications: () => Promise<void>;
  userId: string;
};

async function finish(syncNotifications: () => Promise<void>): Promise<void> {
  try {
    await syncNotifications();
  } catch (error) {
    captureException(error, {
      tags: { feature: "schedule-mutation-notification-sync" },
    });
  }

  await refreshSchedules();
}

export async function createSchedule({
  input,
  syncNotifications,
  timezone,
  userId,
}: CommonOptions & {
  input: CreateScheduleInput;
  timezone: string;
}): Promise<Schedule> {
  const schedule = await db.createItem({
    ...input,
    timezone,
    userId,
  });

  await finish(syncNotifications);
  return schedule;
}

export async function updateSchedule({
  itemId,
  patch,
  syncNotifications,
  timezone,
  userId,
}: CommonOptions & {
  itemId: string;
  patch: EditScheduleInput;
  timezone: string;
}): Promise<Schedule> {
  const schedule = await db.updateItem({
    id: itemId,
    patch,
    timezone,
    userId,
  });

  await finish(syncNotifications);
  return schedule;
}

export async function archiveSchedule({
  itemId,
  syncNotifications,
}: {
  itemId: string;
  syncNotifications: () => Promise<void>;
}): Promise<void> {
  await db.archiveItem(itemId);
  await finish(syncNotifications);
}
