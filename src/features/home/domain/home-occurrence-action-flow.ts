import { getOccurrencesToResolve } from "~/features/recurring/domain/occurrence-actions";
import {
  type CaptureRecurringMutationPostprocessException,
  completeRecurringMutationPostprocessFlow,
} from "~/features/recurring/domain/recurring-mutation-postprocess-flow";
import type {
  CompletionAction,
  CompletionLog,
  DerivedOccurrence,
  RecurringItem,
} from "~/features/recurring/domain/types";

export type HomeFeedOccurrenceLogInput = {
  action: CompletionAction;
  itemId: string;
  scheduledAtUtc: string;
  userId: string;
};

export type SyncAfterHomeOccurrenceMutation = (params: {
  reason: "occurrence-completed" | "occurrence-skipped";
  scope: {
    effectiveFromUtc: string;
    itemId: string;
    type: "item";
  };
}) => Promise<void>;

export type HomeFeedOccurrenceActionTarget = {
  item: RecurringItem;
  occurrence: DerivedOccurrence;
};

export type ProcessHomeFeedOccurrenceActionOptions = {
  action: CompletionAction;
  captureException?: CaptureRecurringMutationPostprocessException;
  completionLogs: CompletionLog[];
  createCompletionLog: (input: HomeFeedOccurrenceLogInput) => Promise<unknown>;
  invalidateRecurringUserQueries: (userId: string) => Promise<void>;
  now: Date;
  refetchFeed: () => Promise<void>;
  syncAfterMutation: SyncAfterHomeOccurrenceMutation;
  target: HomeFeedOccurrenceActionTarget;
  timezone: string;
  userId: string | null;
};

export async function processHomeFeedOccurrenceAction({
  action,
  captureException,
  completionLogs,
  createCompletionLog,
  invalidateRecurringUserQueries,
  now,
  refetchFeed,
  syncAfterMutation,
  target,
  timezone,
  userId,
}: ProcessHomeFeedOccurrenceActionOptions): Promise<void> {
  if (!userId) {
    return;
  }

  const occurrencesToResolve = getOccurrencesToResolve({
    completionLogs,
    item: target.item,
    now,
    primaryOccurrence: target.occurrence,
    timezone,
  });
  const existingScheduledAtUtcSet = new Set(
    completionLogs
      .filter((log) => log.itemId === target.item.id)
      .map((log) => log.scheduledAtUtc)
  );
  const pendingOccurrences = occurrencesToResolve.filter(
    (occurrence) => !existingScheduledAtUtcSet.has(occurrence.scheduledAtUtc)
  );

  if (pendingOccurrences.length > 0) {
    await Promise.all(
      pendingOccurrences.map((occurrence) =>
        createCompletionLog({
          action,
          itemId: target.item.id,
          scheduledAtUtc: occurrence.scheduledAtUtc,
          userId,
        })
      )
    );
  }

  await completeRecurringMutationPostprocessFlow({
    captureException,
    invalidateRecurringUserQueries,
    reason:
      action === "completed" ? "occurrence-completed" : "occurrence-skipped",
    refetchFeed,
    scope: {
      effectiveFromUtc: now.toISOString(),
      itemId: target.item.id,
      type: "item",
    },
    syncAfterMutation,
    userId,
  });
}
