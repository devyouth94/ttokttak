import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { CompletionAction, CompletionLog } from "~/entities/schedule";
import { createCompletionLog } from "~/entities/schedule/api";
import {
  completeHomeFeedOccurrence,
  skipHomeFeedOccurrence,
  type SyncAfterHomeOccurrenceMutation,
} from "~/features/home-feed-occurrence-action";
import { invalidateScheduleReadQueries } from "~/features/read-schedule";
import { Sentry } from "~/shared/config/sentry";
import { getErrorMessage } from "~/shared/lib/errors/get-error-message";

import type { HomeFeedCard } from "./home-feed-sections";

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
        const processOccurrence =
          action === "completed"
            ? completeHomeFeedOccurrence
            : skipHomeFeedOccurrence;

        await processOccurrence({
          captureException: Sentry.captureException,
          completionLogs,
          createCompletionLog,
          invalidateScheduleReadQueries: async (readyUserId) => {
            await invalidateScheduleReadQueries(queryClient, readyUserId);
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
