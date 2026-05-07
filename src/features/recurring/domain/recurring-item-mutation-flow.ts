import type {
  NotificationSyncReason,
  NotificationSyncScope,
} from "~/features/notifications/notification-sync.types";

type RecurringItemMutationReason = Extract<
  NotificationSyncReason,
  "item-archived" | "item-created" | "item-updated"
>;

type CompleteRecurringItemMutationFlowInput = {
  effectiveFromUtc: string;
  invalidateRecurringUserQueries: (userId: string) => Promise<unknown>;
  itemId: string;
  reason: RecurringItemMutationReason;
  syncAfterMutation: (params: {
    reason: NotificationSyncReason;
    scope: NotificationSyncScope;
  }) => Promise<unknown>;
  userId: string;
};

export async function completeRecurringItemMutationFlow({
  effectiveFromUtc,
  invalidateRecurringUserQueries,
  itemId,
  reason,
  syncAfterMutation,
  userId,
}: CompleteRecurringItemMutationFlowInput): Promise<void> {
  await syncAfterMutation({
    reason,
    scope: {
      effectiveFromUtc,
      itemId,
      type: "item",
    },
  });

  await invalidateRecurringUserQueries(userId);
}
