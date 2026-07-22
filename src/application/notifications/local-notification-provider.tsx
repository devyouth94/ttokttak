import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import {
  NotificationContextProvider,
  type NotificationContextValue,
} from "~/features/notifications";
import {
  cancelAllTtokttakLocalReminderNotifications,
  createLocalNotificationSyncLifecycle,
  type NotificationSyncReason,
  type NotificationSyncScope,
  syncLocalReminderNotifications,
} from "~/features/sync-local-notifications";
import { captureException } from "~/sentry";
import { useAppLanguage } from "~/shared/i18n";
import {
  ensureAndroidLocalNotificationChannel,
  getNotificationPermissionState,
  type NotificationPermissionState,
  openNotificationSettings,
  requestNotificationPermission,
} from "~/shared/lib/notifications";

const initialPermissionState: NotificationPermissionState = {
  canOpenSettings: false,
  canRequest: false,
  label: "확인 중",
  status: "undetermined",
};

const ANDROID_REMINDER_NOTIFICATION_CHANNEL_ID = "reminders";

type LocalNotificationProviderProps = PropsWithChildren<{
  timezone: string;
  userId: string | null | undefined;
}>;

export function LocalNotificationProvider({
  children,
  timezone,
  userId,
}: LocalNotificationProviderProps): React.JSX.Element {
  const { language } = useAppLanguage();
  const [permission, setPermission] = useState<NotificationPermissionState>(
    initialPermissionState
  );
  const [isPermissionLoading, setIsPermissionLoading] = useState(true);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const previousLanguageRef = useRef(language);
  const notificationSyncLifecycleRef = useRef<ReturnType<
    typeof createLocalNotificationSyncLifecycle
  > | null>(null);

  if (!notificationSyncLifecycleRef.current) {
    notificationSyncLifecycleRef.current = createLocalNotificationSyncLifecycle(
      {
        cancelAllTtokttakLocalReminderNotifications,
        captureException,
        syncLocalReminderNotifications,
      }
    );
  }

  const notificationSyncLifecycle = notificationSyncLifecycleRef.current;

  useEffect(() => {
    void ensureAndroidLocalNotificationChannel({
      channelId: ANDROID_REMINDER_NOTIFICATION_CHANNEL_ID,
      name: "일정 알림",
    }).catch((error) => {
      captureException(error, {
        tags: {
          feature: "notification-channel-bootstrap",
        },
      });
    });
  }, []);

  const refreshPermission =
    useCallback(async (): Promise<NotificationPermissionState> => {
      setIsPermissionLoading(true);

      try {
        const nextPermission = await getNotificationPermissionState();

        setPermission(nextPermission);

        return nextPermission;
      } finally {
        setIsPermissionLoading(false);
      }
    }, []);

  const requestPermission =
    useCallback(async (): Promise<NotificationPermissionState> => {
      setIsRequestingPermission(true);

      try {
        const nextPermission = await requestNotificationPermission();

        setPermission(nextPermission);

        return nextPermission;
      } finally {
        setIsRequestingPermission(false);
      }
    }, []);

  useEffect(() => {
    void refreshPermission();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refreshPermission();
        void notificationSyncLifecycle.syncAfterAppForegrounded({
          language,
          timezone,
          userId,
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [
    language,
    notificationSyncLifecycle,
    refreshPermission,
    timezone,
    userId,
  ]);

  useEffect(() => {
    void notificationSyncLifecycle.syncAfterSessionRestored({
      language,
      timezone,
      userId,
    });
  }, [language, notificationSyncLifecycle, timezone, userId]);

  useEffect(() => {
    const previousLanguage = previousLanguageRef.current;

    if (previousLanguage === language) {
      return;
    }

    previousLanguageRef.current = language;

    void notificationSyncLifecycle.syncAfterAppLanguageChanged({
      language,
      timezone,
      userId,
    });
  }, [language, notificationSyncLifecycle, timezone, userId]);

  useEffect(() => {
    void notificationSyncLifecycle.flushPendingNotificationTapSync({
      language,
      timezone,
      userId,
    });
  }, [language, notificationSyncLifecycle, timezone, userId]);

  const syncAfterMutation = useCallback(
    async ({
      reason,
      scope,
    }: {
      reason: NotificationSyncReason;
      scope: NotificationSyncScope;
    }): Promise<void> => {
      await notificationSyncLifecycle.syncAfterMutation({
        language,
        reason,
        scope,
        timezone,
        userId,
      });
    },
    [language, notificationSyncLifecycle, timezone, userId]
  );

  const syncAfterNotificationTap = useCallback(async (): Promise<void> => {
    await notificationSyncLifecycle.syncAfterNotificationTapped({
      language,
      timezone,
      userId,
    });
  }, [language, notificationSyncLifecycle, timezone, userId]);

  const value: NotificationContextValue = {
    isPermissionLoading,
    isRequestingPermission,
    openSettings: openNotificationSettings,
    permission,
    refreshPermission,
    requestPermission,
    syncAfterMutation,
    syncAfterNotificationTap,
  };

  return (
    <NotificationContextProvider value={value}>
      {children}
    </NotificationContextProvider>
  );
}
