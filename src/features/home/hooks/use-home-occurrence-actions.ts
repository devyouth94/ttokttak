import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type {
  CompletionAction,
  CompletionLog,
} from "~/features/recurring/domain/types";
import { recurringQueryKeys } from "~/features/recurring/hooks/recurring-query-keys";
import { createCompletionLog } from "~/features/recurring/repositories/completion-logs-repository";
import { getErrorMessage } from "~/lib/errors/get-error-message";

import {
  getOverdueOccurrencesToResolve,
  type HomeFeedCard,
} from "../components/home-screen.helpers";

type SyncAfterMutation = (params: {
  reason: "occurrence-completed" | "occurrence-skipped";
  scope: {
    effectiveFromUtc: string;
    itemId: string;
    type: "item";
  };
}) => Promise<void>;

type UseHomeOccurrenceActionsOptions = {
  completionLogs: CompletionLog[];
  refetchFeed: () => Promise<void>;
  syncAfterMutation: SyncAfterMutation;
  timezone: string;
  userId: string | null;
};

type HomeOccurrenceActions = {
  actionErrorMessage: string | null;
  clearActionError: () => void;
  handleOccurrenceAction: (
    card: HomeFeedCard,
    action: CompletionAction
  ) => Promise<void>;
  processingOccurrenceIds: string[];
};

export function useHomeOccurrenceActions({
  completionLogs,
  refetchFeed,
  syncAfterMutation,
  timezone,
  userId,
}: UseHomeOccurrenceActionsOptions): HomeOccurrenceActions {
  const queryClient = useQueryClient();
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(
    null
  );
  const [processingOccurrenceIds, setProcessingOccurrenceIds] = useState<
    string[]
  >([]);

  const clearActionError = useCallback((): void => {
    setActionErrorMessage(null);
  }, []);

  const handleOccurrenceAction = useCallback(
    async (card: HomeFeedCard, action: CompletionAction): Promise<void> => {
      if (!userId) {
        return;
      }

      setProcessingOccurrenceIds((current) =>
        current.includes(card.id) ? current : [...current, card.id]
      );
      setActionErrorMessage(null);

      try {
        const occurrencesToResolve = getOverdueOccurrencesToResolve({
          card,
          completionLogs,
          now: new Date(),
          timezone,
        });
        const existingScheduledAtUtcSet = new Set(
          completionLogs
            .filter((log) => log.itemId === card.item.id)
            .map((log) => log.scheduledAtUtc)
        );
        const pendingOccurrences = occurrencesToResolve.filter(
          (occurrence) =>
            !existingScheduledAtUtcSet.has(occurrence.scheduledAtUtc)
        );

        if (pendingOccurrences.length > 0) {
          await Promise.all(
            pendingOccurrences.map((occurrence) =>
              createCompletionLog({
                action,
                itemId: card.item.id,
                scheduledAtUtc: occurrence.scheduledAtUtc,
                userId,
              })
            )
          );
        }

        await syncAfterMutation({
          reason:
            action === "completed"
              ? "occurrence-completed"
              : "occurrence-skipped",
          scope: {
            effectiveFromUtc: new Date().toISOString(),
            itemId: card.item.id,
            type: "item",
          },
        });

        await queryClient.invalidateQueries({
          queryKey: recurringQueryKeys.user(userId),
        });
        await refetchFeed();
      } catch (error) {
        setActionErrorMessage(getErrorMessage(error));
      } finally {
        setProcessingOccurrenceIds((current) =>
          current.filter((occurrenceId) => occurrenceId !== card.id)
        );
      }
    },
    [
      completionLogs,
      queryClient,
      refetchFeed,
      syncAfterMutation,
      timezone,
      userId,
    ]
  );

  return {
    actionErrorMessage,
    clearActionError,
    handleOccurrenceAction,
    processingOccurrenceIds,
  };
}
