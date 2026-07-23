import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  OccurrenceAction,
  OccurrenceLog,
} from "~/schedule/rules/occurrence";
import { captureException } from "~/sentry";

import type { HomeFeedCard } from "./home-feed-sections";
import { resolveOccurrence } from "../action";

type UseHomeOccurrenceActionsOptions = {
  completionLogs: OccurrenceLog[];
  syncNotifications: () => Promise<void>;
  timezone: string;
  userId: string | null;
};

type HomeOccurrenceActions = {
  actionErrorMessage: string | null;
  clearActionError: () => void;
  handleOccurrenceAction: (
    card: HomeFeedCard,
    action: OccurrenceAction
  ) => Promise<void>;
  processingOccurrenceIds: string[];
};

export function useHomeOccurrenceActions({
  completionLogs,
  syncNotifications,
  timezone,
  userId,
}: UseHomeOccurrenceActionsOptions): HomeOccurrenceActions {
  const { t } = useTranslation();
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
    async (card: HomeFeedCard, action: OccurrenceAction): Promise<void> => {
      if (!userId) {
        return;
      }

      setProcessingOccurrenceIds((current) =>
        current.includes(card.id) ? current : [...current, card.id]
      );
      setActionErrorMessage(null);

      try {
        await resolveOccurrence({
          action,
          logs: completionLogs,
          now: new Date(),
          syncNotifications,
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
    [completionLogs, syncNotifications, t, timezone, userId]
  );

  return {
    actionErrorMessage,
    clearActionError,
    handleOccurrenceAction,
    processingOccurrenceIds,
  };
}
