import type { RecurringItem } from "~/entities/schedule";
import {
  createRecurringItem,
  type CreateRecurringItemInput,
} from "~/entities/schedule/api";
import { completeScheduleMutation } from "~/features/complete-schedule-mutation";

export type CreateScheduleInput = {
  createItem?: (input: CreateRecurringItemInput) => Promise<RecurringItem>;
  draft: Omit<CreateRecurringItemInput, "userId">;
  now?: () => Date;
  userId: string;
};

export async function createSchedule({
  createItem = createRecurringItem,
  draft,
  now = () => new Date(),
  userId,
}: CreateScheduleInput): Promise<RecurringItem> {
  const effectiveFromUtc = now().toISOString();
  const createdItem = await createItem({
    ...draft,
    userId,
  });

  await completeScheduleMutation({
    effectiveFromUtc,
    itemId: createdItem.id,
    reason: "item-created",
    timezone: draft.timezone,
    userId,
  });

  return createdItem;
}
