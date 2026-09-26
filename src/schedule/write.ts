import { captureException } from "~/sentry";

import * as db from "./db/items";
import { createLogs, listItemLogs } from "./db/logs";
import { refreshSchedules } from "./query";
import { type EditScheduleInput, resolveEdit } from "./rules/edit";
import type { OccurrenceAction } from "./rules/occurrence";
import { assertInput } from "./rules/validate";
import type { CreateScheduleInput } from "./schedule";

type CommonOptions = {
  syncDeviceOutputs: () => Promise<void>;
  userId: string;
};

export async function createSchedule({
  input,
  syncDeviceOutputs,
  timezone,
  userId,
}: CommonOptions & {
  input: CreateScheduleInput;
  timezone: string;
}): Promise<void> {
  assertInput(input);

  await db.createItem({
    ...input,
    timezone,
    userId,
  });

  await finishScheduleWrite(syncDeviceOutputs);
}

export async function updateSchedule({
  itemId,
  patch,
  syncDeviceOutputs,
  timezone,
  userId,
}: CommonOptions & {
  itemId: string;
  patch: EditScheduleInput;
  timezone: string;
}): Promise<void> {
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
  if (edit) {
    await db.updateItem({
      edit,
      id: itemId,
      userId,
    });
  }

  await finishScheduleWrite(syncDeviceOutputs);
}

export async function archiveSchedule({
  itemId,
  syncDeviceOutputs,
}: {
  itemId: string;
  syncDeviceOutputs: () => Promise<void>;
}): Promise<void> {
  await db.archiveItem(itemId);
  await finishScheduleWrite(syncDeviceOutputs);
}

/** occurrence 처리 기록을 저장하고 파생된 기기·화면 상태를 갱신한다. */
export async function recordOccurrences({
  action,
  itemId,
  scheduledAtUtc,
  syncDeviceOutputs,
  userId,
}: CommonOptions & {
  action: OccurrenceAction;
  itemId: string;
  scheduledAtUtc: string[];
}): Promise<void> {
  if (scheduledAtUtc.length > 0) {
    await createLogs(
      scheduledAtUtc.map((scheduledAtUtc) => ({
        action,
        itemId,
        scheduledAtUtc,
        userId,
      }))
    );
  }

  await finishScheduleWrite(syncDeviceOutputs, {
    feature: "home-feed-occurrence-notification-sync",
    reason:
      action === "completed" ? "occurrence-completed" : "occurrence-skipped",
  });
}

async function finishScheduleWrite(
  syncDeviceOutputs: () => Promise<void>,
  tags: { feature: string; reason?: string } = {
    feature: "schedule-mutation-notification-sync",
  }
): Promise<void> {
  try {
    await syncDeviceOutputs();
  } catch (error) {
    captureException(error, {
      tags,
    });
  }

  await refreshSchedules();
}
