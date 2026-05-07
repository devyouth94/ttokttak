import type { PropsWithChildren } from "react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { syncLocalReminderNotifications } from "~/features/notifications/local-notification-sync";
import {
  getNotificationPermissionState,
  type NotificationPermissionState,
  openNotificationSettings,
  requestNotificationPermission,
} from "~/features/notifications/notification-permission";
import {
  type NotificationSyncReason,
  type NotificationSyncScope,
} from "~/features/notifications/notification-sync.types";
import { createLocalNotificationSyncLifecycle } from "~/features/notifications/notification-sync-lifecycle";
import { useSession } from "~/features/session/session-provider";
import { Sentry } from "~/lib/sentry";

type NotificationBootstrapContextValue = {
  isPermissionLoading: boolean;
  isRequestingPermission: boolean;
  openSettings: () => Promise<void>;
  permission: NotificationPermissionState;
  refreshPermission: () => Promise<NotificationPermissionState>;
  requestPermission: () => Promise<NotificationPermissionState>;
  syncAfterMutation: (params: {
    reason: NotificationSyncReason;
    scope: NotificationSyncScope;
  }) => Promise<void>;
  syncAfterNotificationTap: () => Promise<void>;
};

const initialPermissionState: NotificationPermissionState = {
  canOpenSettings: false,
  canRequest: false,
  label: "확인 중",
  status: "undetermined",
};

const ANDROID_REMINDER_NOTIFICATION_CHANNEL_ID = "reminders";

const NotificationBootstrapContext =
  createContext<NotificationBootstrapContextValue | null>(null);

async function ensureAndroidReminderNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    ANDROID_REMINDER_NOTIFICATION_CHANNEL_ID,
    {
      enableVibrate: true,
      importance: Notifications.AndroidImportance.HIGH,
      name: "일정 알림",
      showBadge: true,
      vibrationPattern: [0, 250, 250, 250],
    }
  );
}

export function NotificationBootstrapProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const { profile, user } = useSession();
  const [permission, setPermission] = useState<NotificationPermissionState>(
    initialPermissionState
  );
  const [isPermissionLoading, setIsPermissionLoading] = useState(true);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const notificationSyncLifecycleRef = useRef<ReturnType<
    typeof createLocalNotificationSyncLifecycle
  > | null>(null);

  if (!notificationSyncLifecycleRef.current) {
    notificationSyncLifecycleRef.current = createLocalNotificationSyncLifecycle(
      {
        captureException: (error, context) => {
          Sentry.captureException(error, context);
        },
        syncLocalReminderNotifications,
      }
    );
  }

  const notificationSyncLifecycle = notificationSyncLifecycleRef.current;

  useEffect(() => {
    void ensureAndroidReminderNotificationChannel().catch((error) => {
      Sentry.captureException(error, {
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
          timezone,
          userId: user?.id,
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [notificationSyncLifecycle, refreshPermission, timezone, user?.id]);

  useEffect(() => {
    void notificationSyncLifecycle.syncAfterSessionRestored({
      timezone,
      userId: user?.id,
    });
  }, [notificationSyncLifecycle, timezone, user?.id]);

  useEffect(() => {
    void notificationSyncLifecycle.flushPendingNotificationTapSync({
      timezone,
      userId: user?.id,
    });
  }, [notificationSyncLifecycle, timezone, user?.id]);

  const syncAfterMutation = useCallback(
    async ({
      reason,
      scope,
    }: {
      reason: NotificationSyncReason;
      scope: NotificationSyncScope;
    }): Promise<void> => {
      await notificationSyncLifecycle.syncAfterMutation({
        reason,
        scope,
        timezone,
        userId: user?.id,
      });
    },
    [notificationSyncLifecycle, timezone, user?.id]
  );

  const syncAfterNotificationTap = useCallback(async (): Promise<void> => {
    await notificationSyncLifecycle.syncAfterNotificationTapped({
      timezone,
      userId: user?.id,
    });
  }, [notificationSyncLifecycle, timezone, user?.id]);

  const value: NotificationBootstrapContextValue = {
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
    <NotificationBootstrapContext value={value}>
      {children}
    </NotificationBootstrapContext>
  );
}

export function useNotificationBootstrap(): NotificationBootstrapContextValue {
  const context = use(NotificationBootstrapContext);

  if (!context) {
    throw new Error(
      "useNotificationBootstrap는 NotificationBootstrapProvider 안에서만 사용할 수 있습니다."
    );
  }

  return context;
}
