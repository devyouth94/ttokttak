import type { RecurringItem } from "~/entities/schedule";
import {
  createRecurringItem,
  type CreateRecurringItemInput,
} from "~/entities/schedule/api";
import { completeScheduleMutation } from "~/features/complete-schedule-mutation";
import type { AppLanguage } from "~/shared/i18n";

export type CreateScheduleInput = {
  createItem?: (input: CreateRecurringItemInput) => Promise<RecurringItem>;
  draft: Omit<CreateRecurringItemInput, "userId">;
  language: AppLanguage;
  userId: string;
};

export async function createSchedule({
  createItem = createRecurringItem,
  draft,
  language,
  userId,
}: CreateScheduleInput): Promise<RecurringItem> {
  const createdItem = await createItem({
    ...draft,
    userId,
  });

  await completeScheduleMutation({
    language,
    reason: "item-created",
    timezone: draft.timezone,
    userId,
  });

  return createdItem;
}
