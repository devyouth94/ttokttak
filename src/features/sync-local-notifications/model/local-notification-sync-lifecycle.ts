import type {
  NotificationSyncReason,
  NotificationSyncScope,
} from "~/features/sync-local-notifications/model/notification-sync.types";
import type { AppLanguage } from "~/shared/i18n";

type LocalNotificationSyncContext = {
  language?: AppLanguage;
  timezone: string;
  userId: string | null | undefined;
};

type SyncLocalReminderNotifications = (params: {
  language?: AppLanguage;
  reason: NotificationSyncReason;
  scope: NotificationSyncScope;
  timezone: string;
  userId: string;
}) => Promise<unknown>;

type CancelAllTtokttakLocalReminderNotifications = () => Promise<unknown>;

type CaptureException = (
  error: unknown,
  context: {
    tags: {
      feature: string;
    };
  }
) => void;

type LocalNotificationSyncLifecycle = {
  flushPendingNotificationTapSync: (
    context: LocalNotificationSyncContext
  ) => Promise<void>;
  syncAfterMutation: (
    params: LocalNotificationSyncContext & {
      reason: NotificationSyncReason;
      scope: NotificationSyncScope;
    }
  ) => Promise<void>;
  syncAfterAppLanguageChanged: (
    context: LocalNotificationSyncContext
  ) => Promise<void>;
  syncAfterAppForegrounded: (
    context: LocalNotificationSyncContext
  ) => Promise<void>;
  syncAfterNotificationTapped: (
    context: LocalNotificationSyncContext
  ) => Promise<void>;
  syncAfterSessionRestored: (
    context: LocalNotificationSyncContext
  ) => Promise<void>;
};

type LocalNotificationSyncLifecycleDeps = {
  cancelAllTtokttakLocalReminderNotifications: CancelAllTtokttakLocalReminderNotifications;
  captureException: CaptureException;
  syncLocalReminderNotifications: SyncLocalReminderNotifications;
};

export function createLocalNotificationSyncLifecycle({
  cancelAllTtokttakLocalReminderNotifications,
  captureException,
  syncLocalReminderNotifications,
}: LocalNotificationSyncLifecycleDeps): LocalNotificationSyncLifecycle {
  let hasPendingNotificationTapSync = false;
  let hasCheckedSignedOutSessionCleanup = false;
  let lastSessionSyncKey: string | null = null;
  let lastObservedUserId: string | null = null;

  async function syncAllSafely(params: {
    context: LocalNotificationSyncContext;
    feature: string;
    reason: NotificationSyncReason;
  }): Promise<void> {
    const { context, feature, reason } = params;

    if (!context.userId) {
      return;
    }

    try {
      await syncLocalReminderNotifications({
        ...(context.language ? { language: context.language } : {}),
        reason,
        scope: { type: "all" },
        timezone: context.timezone,
        userId: context.userId,
      });
    } catch (error) {
      captureException(error, {
        tags: {
          feature,
        },
      });
    }
  }

  async function syncAllForUserAction(params: {
    context: LocalNotificationSyncContext;
    feature: string;
    reason: NotificationSyncReason;
  }): Promise<void> {
    const { context, feature, reason } = params;

    if (!context.userId) {
      return;
    }

    try {
      await syncLocalReminderNotifications({
        ...(context.language ? { language: context.language } : {}),
        reason,
        scope: { type: "all" },
        timezone: context.timezone,
        userId: context.userId,
      });
    } catch (error) {
      captureException(error, {
        tags: {
          feature,
        },
      });
      throw error;
    }
  }

  async function syncAfterNotificationTapped(
    context: LocalNotificationSyncContext
  ): Promise<void> {
    if (!context.userId) {
      hasPendingNotificationTapSync = true;
      return;
    }

    hasPendingNotificationTapSync = false;

    await syncAllSafely({
      context,
      feature: "local-notification-tap-sync",
      reason: "notification-tapped",
    });
  }

  async function cleanupSessionEndedNotifications(): Promise<void> {
    try {
      await cancelAllTtokttakLocalReminderNotifications();
    } catch (error) {
      captureException(error, {
        tags: {
          feature: "local-notification-session-ended-cleanup",
        },
      });
    }
  }

  return {
    async flushPendingNotificationTapSync(context) {
      if (!hasPendingNotificationTapSync || !context.userId) {
        return;
      }

      await syncAfterNotificationTapped(context);
    },

    async syncAfterMutation({ language, reason, scope, timezone, userId }) {
      if (!userId) {
        return;
      }

      await syncLocalReminderNotifications({
        ...(language ? { language } : {}),
        reason,
        scope,
        timezone,
        userId,
      });
    },

    async syncAfterAppLanguageChanged(context) {
      await syncAllForUserAction({
        context,
        feature: "local-notification-language-sync",
        reason: "app-language-changed",
      });
    },

    async syncAfterAppForegrounded(context) {
      await syncAllSafely({
        context,
        feature: "local-notification-foreground-sync",
        reason: "app-foregrounded",
      });
    },

    syncAfterNotificationTapped,

    async syncAfterSessionRestored({ language, timezone, userId }) {
      if (!userId) {
        if (lastObservedUserId || !hasCheckedSignedOutSessionCleanup) {
          hasCheckedSignedOutSessionCleanup = true;
          lastObservedUserId = null;

          await cleanupSessionEndedNotifications();
        }

        lastSessionSyncKey = null;
        return;
      }

      if (lastObservedUserId && lastObservedUserId !== userId) {
        await cleanupSessionEndedNotifications();
      }

      lastObservedUserId = userId;

      const syncKey = `${userId}:${timezone}:${language ?? ""}`;

      if (lastSessionSyncKey === syncKey) {
        return;
      }

      lastSessionSyncKey = syncKey;

      await syncAllSafely({
        context: {
          ...(language ? { language } : {}),
          timezone,
          userId,
        },
        feature: "local-notification-session-sync",
        reason: "session-restored",
      });
    },
  };
}
