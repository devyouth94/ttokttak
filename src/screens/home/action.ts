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

type Target = {
  item: Schedule;
  occurrence: Occurrence;
};

/** 홈에서 occurrence를 완료 또는 건너뛰기 처리한다. */
export async function resolveOccurrence({
  action,
  logs,
  now,
  syncNotifications,
  target,
  timezone,
  userId,
}: {
  action: OccurrenceAction;
  logs: OccurrenceLog[];
  now: Date;
  syncNotifications: () => Promise<void>;
  target: Target;
  timezone: string;
  userId: string | null;
}): Promise<void> {
  if (!userId) {
    return;
  }

  const existing = new Set(
    logs
      .filter((log) => log.itemId === target.item.id)
      .map((log) => log.scheduledAtUtc)
  );
  const pending = getOccurrences({ logs, now, target, timezone }).filter(
    (occurrence) => !existing.has(occurrence.scheduledAtUtc)
  );

  if (pending.length > 0) {
    await createLogs(
      pending.map((occurrence) => ({
        action,
        itemId: target.item.id,
        scheduledAtUtc: occurrence.scheduledAtUtc,
        userId,
      }))
    );
  }

  try {
    await syncNotifications();
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

function getOccurrences({
  logs,
  now,
  target,
  timezone,
}: {
  logs: OccurrenceLog[];
  now: Date;
  target: Target;
  timezone: string;
}): Occurrence[] {
  if (target.occurrence.status !== "overdue") {
    return [target.occurrence];
  }

  return createOccurrences({
    logs,
    now,
    schedules: [target.item],
    timezone,
  })
    .range(
      {
        endUtc: target.occurrence.scheduledAtUtc,
        startUtc: toUtcRange(target.item.startDateLocal, timezone).startUtc,
      },
      "overdue"
    )
    .map(({ occurrence }) => occurrence);
}
