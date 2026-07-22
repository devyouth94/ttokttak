import type {
  CompletionAction,
  CompletionLog,
  DerivedOccurrence,
  RecurringItem,
} from "~/entities/schedule";
import { createItemOccurrenceProjection } from "~/entities/schedule";

type CaptureHomeFeedOccurrenceActionException = (
  error: unknown,
  context: {
    tags: {
      feature: string;
      reason: "occurrence-completed" | "occurrence-skipped";
    };
  }
) => void;

export type HomeFeedOccurrenceLogInput = {
  action: CompletionAction;
  itemId: string;
  scheduledAtUtc: string;
  userId: string;
};

export type HomeFeedOccurrenceActionTarget = {
  item: RecurringItem;
  occurrence: DerivedOccurrence;
};

export type ProcessHomeFeedOccurrenceActionOptions = {
  action: CompletionAction;
  captureException?: CaptureHomeFeedOccurrenceActionException;
  completionLogs: CompletionLog[];
  createCompletionLogs: (
    inputs: HomeFeedOccurrenceLogInput[]
  ) => Promise<unknown>;
  invalidateScheduleReadQueries: (userId: string) => Promise<void>;
  now: Date;
  refetchFeed: () => Promise<void>;
  syncNotifications: () => Promise<void>;
  target: HomeFeedOccurrenceActionTarget;
  timezone: string;
  userId: string | null;
};

export type HomeFeedOccurrenceUseCaseOptions = Omit<
  ProcessHomeFeedOccurrenceActionOptions,
  "action"
>;

export async function completeHomeFeedOccurrence(
  options: HomeFeedOccurrenceUseCaseOptions
): Promise<void> {
  await processHomeFeedOccurrenceAction({
    ...options,
    action: "completed",
  });
}

export async function skipHomeFeedOccurrence(
  options: HomeFeedOccurrenceUseCaseOptions
): Promise<void> {
  await processHomeFeedOccurrenceAction({
    ...options,
    action: "skipped",
  });
}

async function processHomeFeedOccurrenceAction({
  action,
  captureException,
  completionLogs,
  createCompletionLogs,
  invalidateScheduleReadQueries,
  now,
  refetchFeed,
  syncNotifications,
  target,
  timezone,
  userId,
}: ProcessHomeFeedOccurrenceActionOptions): Promise<void> {
  if (!userId) {
    return;
  }

  const occurrencesToResolve = getHomeFeedOccurrencesToResolve({
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
    await createCompletionLogs(
      pendingOccurrences.map((occurrence) => ({
        action,
        itemId: target.item.id,
        scheduledAtUtc: occurrence.scheduledAtUtc,
        userId,
      }))
    );
  }

  const reason =
    action === "completed" ? "occurrence-completed" : "occurrence-skipped";
  try {
    await syncNotifications();
  } catch (error) {
    captureException?.(error, {
      tags: {
        feature: "home-feed-occurrence-notification-sync",
        reason,
      },
    });
  }

  await invalidateScheduleReadQueries(userId);
  await refetchFeed();
}

function getHomeFeedOccurrencesToResolve({
  completionLogs,
  item,
  now,
  primaryOccurrence,
  timezone,
}: {
  completionLogs: CompletionLog[];
  item: RecurringItem;
  now: Date;
  primaryOccurrence: DerivedOccurrence;
  timezone: string;
}): DerivedOccurrence[] {
  if (primaryOccurrence.status !== "overdue") {
    return [primaryOccurrence];
  }

  return createItemOccurrenceProjection({
    completionLogs,
    item,
    now,
    timezone,
  }).getOverdueOccurrences({
    lookbackStartLocalDate: item.startDateLocal,
    rangeEndUtc: primaryOccurrence.scheduledAtUtc,
  });
}
