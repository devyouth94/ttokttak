import {
  archiveRecurringItem,
  type ArchiveRecurringItemOptions,
} from "~/entities/schedule/api";
import { completeScheduleMutation } from "~/features/complete-schedule-mutation";

export type ArchiveScheduleInput = {
  archiveItem?: (input: ArchiveRecurringItemOptions) => Promise<void>;
  itemId: string;
  timezone: string;
  userId: string;
};

export async function archiveSchedule({
  archiveItem = archiveRecurringItem,
  itemId,
  timezone,
  userId,
}: ArchiveScheduleInput): Promise<void> {
  await archiveItem({
    id: itemId,
    userId,
  });

  await completeScheduleMutation({
    reason: "item-archived",
    timezone,
    userId,
  });
}
