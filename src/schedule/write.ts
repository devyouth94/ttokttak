import { captureException } from "~/sentry";

import * as db from "./db/items";
import { listItemLogs } from "./db/logs";
import { refreshSchedules } from "./query";
import { type EditScheduleInput, resolveEdit } from "./rules/edit";
import { assertInput } from "./rules/validate";
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
  assertInput(input);

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
  const item = await db.getItem({ id: itemId, userId });

  if (item.contentStatus === "unrecoverable") {
    throw new Error("내용을 복구할 수 없는 일정은 수정할 수 없습니다.");
  }

  const edit = resolveEdit({
    completionLogs: await listItemLogs({ itemId, userId }),
    input: patch,
    item,
    now: new Date(),
    timezone,
  });
  const schedule = edit
    ? await db.updateItem({
        edit,
        id: itemId,
        userId,
      })
    : item;

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
