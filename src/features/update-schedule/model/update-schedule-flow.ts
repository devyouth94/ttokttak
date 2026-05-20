import type { RecurringItem } from "~/entities/schedule";
import {
  updateRecurringItem,
  type UpdateRecurringItemInput,
} from "~/entities/schedule/api";

export type CompleteUpdateScheduleMutation = (input: {
  effectiveFromUtc: string;
  itemId: string;
  reason: "item-updated";
  userId: string;
}) => Promise<void>;

export type UpdateScheduleInput = {
  completeMutation: CompleteUpdateScheduleMutation;
  itemId: string;
  now?: () => Date;
  patch: UpdateRecurringItemInput["patch"];
  timezone: string;
  updateItem?: (input: UpdateRecurringItemInput) => Promise<RecurringItem>;
  userId: string;
};

export async function updateSchedule({
  completeMutation,
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

  await completeMutation({
    effectiveFromUtc,
    itemId,
    reason: "item-updated",
    userId,
  });

  return updatedItem;
}
