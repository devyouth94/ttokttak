import {
  archiveRecurringItem,
  type ArchiveRecurringItemOptions,
} from "~/entities/schedule/api";

export type CompleteArchiveScheduleMutation = (input: {
  effectiveFromUtc: string;
  itemId: string;
  reason: "item-archived";
  userId: string;
}) => Promise<void>;

export type ArchiveScheduleInput = {
  archiveItem?: (input: ArchiveRecurringItemOptions) => Promise<void>;
  completeMutation: CompleteArchiveScheduleMutation;
  itemId: string;
  now?: () => Date;
  userId: string;
};

export async function archiveSchedule({
  archiveItem = archiveRecurringItem,
  completeMutation,
  itemId,
  now = () => new Date(),
  userId,
}: ArchiveScheduleInput): Promise<void> {
  const effectiveFromUtc = now().toISOString();

  await archiveItem({
    id: itemId,
    userId,
  });

  await completeMutation({
    effectiveFromUtc,
    itemId,
    reason: "item-archived",
    userId,
  });
}
