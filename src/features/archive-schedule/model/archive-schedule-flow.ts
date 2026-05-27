import {
  archiveRecurringItem,
  type ArchiveRecurringItemOptions,
} from "~/entities/schedule/api";
import { completeScheduleMutation } from "~/features/complete-schedule-mutation";
import type { AppLanguage } from "~/shared/i18n";

export type ArchiveScheduleInput = {
  archiveItem?: (input: ArchiveRecurringItemOptions) => Promise<void>;
  itemId: string;
  language: AppLanguage;
  timezone: string;
  userId: string;
};

export async function archiveSchedule({
  archiveItem = archiveRecurringItem,
  itemId,
  language,
  timezone,
  userId,
}: ArchiveScheduleInput): Promise<void> {
  await archiveItem({
    id: itemId,
    userId,
  });

  await completeScheduleMutation({
    language,
    reason: "item-archived",
    timezone,
    userId,
  });
}
