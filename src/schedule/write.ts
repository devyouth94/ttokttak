import { captureException } from "~/sentry";

import { invalidateScheduleCache } from "./cache";
import * as db from "./db/items";
import { createLogs, listItemLogs } from "./db/logs";
import type {
  CreateScheduleInput,
  OccurrenceAction,
  OccurrenceEntry,
  OccurrenceLog,
} from "./model";
import { selectOccurrencesToRecord } from "./occurrence-policy";
import { type EditScheduleInput, resolveEdit } from "./rules/edit";
import { assertInput } from "./rules/validate";

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

  await finishScheduleWrite(userId, syncDeviceOutputs);
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

  await finishScheduleWrite(userId, syncDeviceOutputs);
}

export async function archiveSchedule({
  itemId,
  syncDeviceOutputs,
  userId,
}: CommonOptions & { itemId: string }): Promise<void> {
  await db.archiveItem(itemId);
  await finishScheduleWrite(userId, syncDeviceOutputs);
}

/** occurrence 처리 의도를 기록하고 파생된 기기·화면 상태를 갱신한다. */
export async function processOccurrence({
  action,
  logs,
  now,
  syncDeviceOutputs,
  target,
  timezone,
  userId,
}: CommonOptions & {
  action: OccurrenceAction;
  logs: OccurrenceLog[];
  now: Date;
  target: OccurrenceEntry;
  timezone: string;
}): Promise<void> {
  const occurrences = selectOccurrencesToRecord({
    logs,
    now,
    target,
    timezone,
  });

  if (occurrences.length > 0) {
    await createLogs(
      occurrences.map(({ scheduledAtUtc }) => ({
        action,
        itemId: target.schedule.id,
        scheduledAtUtc,
        userId,
      }))
    );
  }

  await finishScheduleWrite(userId, syncDeviceOutputs, {
    feature: "home-feed-occurrence-notification-sync",
    reason:
      action === "completed" ? "occurrence-completed" : "occurrence-skipped",
  });
}

async function finishScheduleWrite(
  userId: string,
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

  await invalidateScheduleCache(userId);
}
