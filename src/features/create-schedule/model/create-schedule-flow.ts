import type { RecurringItem } from "~/entities/schedule";
import {
  createRecurringItem,
  type CreateRecurringItemInput,
} from "~/entities/schedule/api";

export type CompleteCreateScheduleMutation = (input: {
  effectiveFromUtc: string;
  itemId: string;
  reason: "item-created";
  userId: string;
}) => Promise<void>;

export type CreateScheduleInput = {
  completeMutation: CompleteCreateScheduleMutation;
  createItem?: (input: CreateRecurringItemInput) => Promise<RecurringItem>;
  draft: Omit<CreateRecurringItemInput, "userId">;
  now?: () => Date;
  userId: string;
};

export async function createSchedule({
  completeMutation,
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

  await completeMutation({
    effectiveFromUtc,
    itemId: createdItem.id,
    reason: "item-created",
    userId,
  });

  return createdItem;
}
