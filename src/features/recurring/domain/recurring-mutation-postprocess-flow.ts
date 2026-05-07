import type {
  NotificationSyncReason,
  NotificationSyncScope,
} from "~/features/notifications/notification-sync.types";

export type RecurringMutationPostprocessReason = Extract<
  NotificationSyncReason,
  | "item-archived"
  | "item-created"
  | "item-updated"
  | "occurrence-completed"
  | "occurrence-skipped"
>;

export type CaptureRecurringMutationPostprocessException = (
  error: unknown,
  context: {
    tags: {
      feature: string;
      reason: RecurringMutationPostprocessReason;
    };
  }
) => void;

type CompleteRecurringMutationPostprocessFlowInput<
  Reason extends RecurringMutationPostprocessReason,
  Scope extends NotificationSyncScope,
> = {
  captureException?: CaptureRecurringMutationPostprocessException;
  invalidateRecurringUserQueries: (userId: string) => Promise<unknown>;
  refetchFeed?: () => Promise<unknown>;
  reason: Reason;
  scope: Scope;
  syncAfterMutation: (params: {
    reason: Reason;
    scope: Scope;
  }) => Promise<unknown>;
  userId: string;
};

export async function completeRecurringMutationPostprocessFlow<
  Reason extends RecurringMutationPostprocessReason,
  Scope extends NotificationSyncScope,
>({
  captureException,
  invalidateRecurringUserQueries,
  reason,
  refetchFeed,
  scope,
  syncAfterMutation,
  userId,
}: CompleteRecurringMutationPostprocessFlowInput<
  Reason,
  Scope
>): Promise<void> {
  try {
    await syncAfterMutation({
      reason,
      scope,
    });
  } catch (error) {
    captureException?.(error, {
      tags: {
        feature: "recurring-mutation-notification-sync",
        reason,
      },
    });
  }

  await invalidateRecurringUserQueries(userId);
  await refetchFeed?.();
}
