import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { CompletionAction, CompletionLog } from "~/entities/schedule";
import { createCompletionLog } from "~/entities/schedule/api";
import { recurringQueryKeys } from "~/features/recurring/hooks/recurring-query-keys";
import { Sentry } from "~/shared/config/sentry";
import { getErrorMessage } from "~/shared/lib/errors/get-error-message";

import type { HomeFeedCard } from "../components/home-screen.helpers";
import {
  processHomeFeedOccurrenceAction,
  type SyncAfterHomeOccurrenceMutation,
} from "../domain/home-occurrence-action-flow";

type UseHomeOccurrenceActionsOptions = {
  completionLogs: CompletionLog[];
  refetchFeed: () => Promise<void>;
  syncAfterMutation: SyncAfterHomeOccurrenceMutation;
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
        await processHomeFeedOccurrenceAction({
          action,
          captureException: Sentry.captureException,
          completionLogs,
          createCompletionLog,
          invalidateRecurringUserQueries: async (readyUserId) => {
            await queryClient.invalidateQueries({
              queryKey: recurringQueryKeys.user(readyUserId),
            });
          },
          now: new Date(),
          refetchFeed,
          syncAfterMutation,
          target: card,
          timezone,
          userId,
        });
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
