import type { NotificationSyncReason } from "~/features/notifications/notification-sync.types";
import { completeRecurringItemMutationFlow } from "~/features/recurring/model/recurring-item-mutation-flow";
import type { CaptureRecurringMutationPostprocessException } from "~/features/recurring/model/recurring-mutation-postprocess-flow";

import { recurringQueryKeys } from "./recurring-query-keys";

type RecurringMutationQueryClient = {
  invalidateQueries: (params: {
    queryKey: ReturnType<typeof recurringQueryKeys.user>;
  }) => Promise<unknown>;
};

type RecurringItemMutationReason = Extract<
  NotificationSyncReason,
  "item-archived" | "item-created" | "item-updated"
>;

type CompleteItemMutationInput = {
  effectiveFromUtc: string;
  itemId: string;
  reason: RecurringItemMutationReason;
  userId: string;
};

type CreateRecurringMutationPostprocessAdapterInput = {
  captureException?: CaptureRecurringMutationPostprocessException;
  queryClient: RecurringMutationQueryClient;
  syncAfterMutation: Parameters<
    typeof completeRecurringItemMutationFlow
  >[0]["syncAfterMutation"];
};

export type RecurringMutationPostprocessAdapter = {
  completeItemMutation: (input: CompleteItemMutationInput) => Promise<void>;
};

export function createRecurringMutationPostprocessAdapter({
  captureException,
  queryClient,
  syncAfterMutation,
}: CreateRecurringMutationPostprocessAdapterInput): RecurringMutationPostprocessAdapter {
  async function invalidateRecurringUserQueries(userId: string): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: recurringQueryKeys.user(userId),
    });
  }

  return {
    completeItemMutation: async ({
      effectiveFromUtc,
      itemId,
      reason,
      userId,
    }) => {
      await completeRecurringItemMutationFlow({
        captureException,
        effectiveFromUtc,
        invalidateRecurringUserQueries,
        itemId,
        reason,
        syncAfterMutation,
        userId,
      });
    },
  };
}
