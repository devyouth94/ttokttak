import type { RecurringItem } from "~/entities/schedule";
import {
  updateRecurringItem,
  type UpdateRecurringItemInput,
} from "~/entities/schedule/api";
import { completeScheduleMutation } from "~/features/complete-schedule-mutation";

export type UpdateScheduleInput = {
  itemId: string;
  patch: UpdateRecurringItemInput["patch"];
  timezone: string;
  updateItem?: (input: UpdateRecurringItemInput) => Promise<RecurringItem>;
  userId: string;
};

export async function updateSchedule({
  itemId,
  patch,
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
    reason: "item-updated",
    timezone,
    userId,
  });

  return updatedItem;
}
