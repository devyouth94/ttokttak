import type { RecurringItem } from "~/entities/schedule";
import {
  updateRecurringItem,
  type UpdateRecurringItemInput,
} from "~/entities/schedule/api";
import { completeScheduleMutation } from "~/features/complete-schedule-mutation";

export type UpdateScheduleInput = {
  itemId: string;
  now?: () => Date;
  patch: UpdateRecurringItemInput["patch"];
  timezone: string;
  updateItem?: (input: UpdateRecurringItemInput) => Promise<RecurringItem>;
  userId: string;
};

export async function updateSchedule({
  itemId,
  now = () => new Date(),
  patch,
  timezone,
  updateItem = updateRecurringItem,
  userId,
}: UpdateScheduleInput): Promise<RecurringItem> {
  const effectiveFromUtc = now().toISOString();
  const updatedItem = await updateItem({
    id: itemId,
    patch,
    timezone,
    userId,
  });

  await completeScheduleMutation({
    effectiveFromUtc,
    itemId,
    reason: "item-updated",
    timezone,
    userId,
  });

  return updatedItem;
}
