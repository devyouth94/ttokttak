import {
  archiveRecurringItem,
  type ArchiveRecurringItemOptions,
} from "~/entities/schedule/api";
import { completeScheduleMutation } from "~/features/complete-schedule-mutation";

export type ArchiveScheduleInput = {
  archiveItem?: (input: ArchiveRecurringItemOptions) => Promise<void>;
  itemId: string;
  now?: () => Date;
  timezone: string;
  userId: string;
};

export async function archiveSchedule({
  archiveItem = archiveRecurringItem,
  itemId,
  now = () => new Date(),
  timezone,
  userId,
}: ArchiveScheduleInput): Promise<void> {
  const effectiveFromUtc = now().toISOString();

  await archiveItem({
    id: itemId,
    userId,
  });

  await completeScheduleMutation({
    effectiveFromUtc,
    itemId,
    reason: "item-archived",
    timezone,
    userId,
  });
}
