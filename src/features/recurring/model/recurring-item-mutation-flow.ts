import type {
  NotificationSyncReason,
  NotificationSyncScope,
} from "~/features/notifications/notification-sync.types";
import {
  type CaptureRecurringMutationPostprocessException,
  completeRecurringMutationPostprocessFlow,
} from "~/features/recurring/model/recurring-mutation-postprocess-flow";

type RecurringItemMutationReason = Extract<
  NotificationSyncReason,
  "item-archived" | "item-created" | "item-updated"
>;

type CompleteRecurringItemMutationFlowInput = {
  captureException?: CaptureRecurringMutationPostprocessException;
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
  captureException,
  invalidateRecurringUserQueries,
  reason,
  syncAfterMutation,
  userId,
}: CompleteRecurringItemMutationFlowInput): Promise<void> {
  await completeRecurringMutationPostprocessFlow({
    captureException,
    invalidateRecurringUserQueries,
    reason,
    scope: { type: "all" },
    syncAfterMutation,
    userId,
  });
}
