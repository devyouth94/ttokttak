import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import type { CompletionAction, CompletionLog } from "~/entities/schedule";
import { createCompletionLogs } from "~/entities/schedule/api";
import {
  completeHomeFeedOccurrence,
  skipHomeFeedOccurrence,
  type SyncAfterHomeOccurrenceMutation,
} from "~/features/home-feed-occurrence-action";
import { invalidateScheduleReadQueries } from "~/features/read-schedule";
import { captureException } from "~/sentry";

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
  const { t } = useTranslation();
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
          captureException,
          completionLogs,
          createCompletionLogs,
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
        captureException(error);
        setActionErrorMessage(t("home.feed.actionErrorDescription"));
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
      t,
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
