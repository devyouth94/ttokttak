import { useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  Occurrence,
  OccurrenceAction,
  OccurrenceLog,
  Schedule,
} from "~/schedule/model";
import { processOccurrence } from "~/schedule/write";
import { captureException } from "~/sentry";

type HomeOccurrenceTarget = {
  item: Schedule;
  occurrence: Occurrence;
};

type HomeActionTarget = HomeOccurrenceTarget & { id: string };

type UseHomeActionsOptions = {
  completionLogs: OccurrenceLog[];
  syncDeviceOutputs: () => Promise<void>;
  timezone: string;
  userId: string | null;
};

/** 홈 occurrence 처리의 진행 상태와 오류를 관리한다. */
export function useHomeActions({
  completionLogs,
  syncDeviceOutputs,
  timezone,
  userId,
}: UseHomeActionsOptions) {
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  async function runAction(
    target: HomeActionTarget,
    action: OccurrenceAction
  ): Promise<void> {
    if (!userId) {
      return;
    }

    setProcessingIds((current) =>
      current.includes(target.id) ? current : [...current, target.id]
    );
    setErrorMessage(null);

    try {
      await processOccurrence({
        action,
        logs: completionLogs,
        now: new Date(),
        syncDeviceOutputs,
        target: {
          occurrence: target.occurrence,
          schedule: target.item,
        },
        timezone,
        userId,
      });
    } catch (error) {
      captureException(error);
      setErrorMessage(t("home.feed.actionErrorDescription"));
    } finally {
      setProcessingIds((current) =>
        current.filter((occurrenceId) => occurrenceId !== target.id)
      );
    }
  }

  return {
    clearError: () => setErrorMessage(null),
    errorMessage,
    processingIds,
    runAction,
  };
}
