import { invalidateScheduleReadQueries } from "~/features/read-schedule";
import type { NotificationSyncReason } from "~/features/sync-local-notifications";
import { syncLocalReminderNotifications } from "~/features/sync-local-notifications";
import { Sentry } from "~/shared/config/sentry";
import type { AppLanguage } from "~/shared/i18n";
import { queryClient } from "~/shared/lib/query/query-client";

type ScheduleMutationReason = Extract<
  NotificationSyncReason,
  "item-archived" | "item-created" | "item-updated"
>;

type CompleteScheduleMutationInput = {
  language: AppLanguage;
  reason: ScheduleMutationReason;
  timezone: string;
  userId: string;
};

export async function completeScheduleMutation({
  language,
  reason,
  timezone,
  userId,
}: CompleteScheduleMutationInput): Promise<void> {
  try {
    await syncLocalReminderNotifications({
      language,
      reason,
      scope: { type: "all" },
      timezone,
      userId,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        feature: "schedule-mutation-notification-sync",
        reason,
      },
    });
  }

  await invalidateScheduleReadQueries(queryClient, userId);
}
