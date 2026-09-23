import { useState } from "react";
import { useTranslation } from "react-i18next";

import { createLogs } from "~/schedule/db/logs";
import { refreshSchedules } from "~/schedule/query";
import {
  createOccurrences,
  type Occurrence,
  type OccurrenceAction,
  type OccurrenceLog,
  toUtcRange,
} from "~/schedule/rules/occurrence";
import type { Schedule } from "~/schedule/schedule";
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

  const runAction = async (
    target: HomeActionTarget,
    action: OccurrenceAction
  ): Promise<void> => {
    if (!userId) {
      return;
    }

    setProcessingIds((current) =>
      current.includes(target.id) ? current : [...current, target.id]
    );
    setErrorMessage(null);

    try {
      await processHomeOccurrence({
        action,
        logs: completionLogs,
        now: new Date(),
        syncDeviceOutputs,
        target,
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
  };

  return {
    clearError: () => setErrorMessage(null),
    errorMessage,
    processingIds,
    runAction,
  };
}

/**
 * 홈 occurrence를 기록하고 알림과 피드 데이터를 다시 맞춘다.
 * 지난 일정은 선택한 occurrence까지의 미처리 항목을 함께 처리한다.
 */
export async function processHomeOccurrence({
  action,
  logs,
  now,
  syncDeviceOutputs,
  target,
  timezone,
  userId,
}: {
  action: OccurrenceAction;
  logs: OccurrenceLog[];
  now: Date;
  syncDeviceOutputs: () => Promise<void>;
  target: HomeOccurrenceTarget;
  timezone: string;
  userId: string;
}): Promise<void> {
  const unresolved = getUnresolvedOccurrences({ logs, now, target, timezone });

  if (unresolved.length > 0) {
    await createLogs(
      unresolved.map((occurrence) => ({
        action,
        itemId: target.item.id,
        scheduledAtUtc: occurrence.scheduledAtUtc,
        userId,
      }))
    );
  }

  // 알림 동기화 실패가 이미 저장된 처리 기록의 피드 반영을 막지 않게 한다.
  try {
    await syncDeviceOutputs();
  } catch (error) {
    captureException(error, {
      tags: {
        feature: "home-feed-occurrence-notification-sync",
        reason:
          action === "completed"
            ? "occurrence-completed"
            : "occurrence-skipped",
      },
    });
  }

  await refreshSchedules();
}

/** 이미 처리된 기록을 제외하고 이번 입력으로 처리할 occurrence를 반환한다. */
function getUnresolvedOccurrences({
  logs,
  now,
  target,
  timezone,
}: {
  logs: OccurrenceLog[];
  now: Date;
  target: HomeOccurrenceTarget;
  timezone: string;
}): Occurrence[] {
  const candidates =
    target.occurrence.status === "overdue"
      ? createOccurrences({
          logs,
          now,
          schedules: [target.item],
          timezone,
        })
          .range(
            {
              endUtc: target.occurrence.scheduledAtUtc,
              startUtc: toUtcRange(target.item.startDateLocal, timezone)
                .startUtc,
            },
            "overdue"
          )
          .map(({ occurrence }) => occurrence)
      : [target.occurrence];
  const loggedTimes = new Set(
    logs
      .filter((log) => log.itemId === target.item.id)
      .map((log) => log.scheduledAtUtc)
  );

  return candidates.filter(
    (occurrence) => !loggedTimes.has(occurrence.scheduledAtUtc)
  );
}
