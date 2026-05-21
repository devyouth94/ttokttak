import {
  completeRecurringItemMutationFlow,
  recurringQueryKeys,
} from "~/features/recurring";
import type { NotificationSyncReason } from "~/features/sync-local-notifications";
import { syncLocalReminderNotifications } from "~/features/sync-local-notifications";
import { Sentry } from "~/shared/config/sentry";
import { queryClient } from "~/shared/lib/query/query-client";

type ScheduleMutationReason = Extract<
  NotificationSyncReason,
  "item-archived" | "item-created" | "item-updated"
>;

type CompleteScheduleMutationInput = {
  effectiveFromUtc: string;
  itemId: string;
  reason: ScheduleMutationReason;
  timezone: string;
  userId: string;
};

export async function completeScheduleMutation({
  effectiveFromUtc,
  itemId,
  reason,
  timezone,
  userId,
}: CompleteScheduleMutationInput): Promise<void> {
  await completeRecurringItemMutationFlow({
    captureException: (error, context) => {
      Sentry.captureException(error, context);
    },
    effectiveFromUtc,
    invalidateRecurringUserQueries: async (readyUserId) => {
      await queryClient.invalidateQueries({
        queryKey: recurringQueryKeys.user(readyUserId),
      });
    },
    itemId,
    reason,
    syncAfterMutation: async ({ reason: syncReason, scope }) => {
      await syncLocalReminderNotifications({
        reason: syncReason,
        scope,
        timezone,
        userId,
      });
    },
    userId,
  });
}
