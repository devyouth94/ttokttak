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
  const lastSessionSyncKeyRef = useRef<string | null>(null);

  const syncAllLocalReminderNotifications = useCallback(
    (params: { feature: string; reason: NotificationSyncReason }): void => {
      if (!user?.id) {
        return;
      }

      void syncLocalReminderNotifications({
        reason: params.reason,
        scope: { type: "all" },
        timezone,
        userId: user.id,
      }).catch((error) => {
        Sentry.captureException(error, {
          tags: {
            feature: params.feature,
          },
        });
      });
    },
    [timezone, user?.id]
  );

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
        syncAllLocalReminderNotifications({
          feature: "local-notification-foreground-sync",
          reason: "app-foregrounded",
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshPermission, syncAllLocalReminderNotifications]);

  useEffect(() => {
    if (!user?.id) {
      lastSessionSyncKeyRef.current = null;
      return;
    }

    const syncKey = `${user.id}:${timezone}`;

    if (lastSessionSyncKeyRef.current === syncKey) {
      return;
    }

    lastSessionSyncKeyRef.current = syncKey;

    syncAllLocalReminderNotifications({
      feature: "local-notification-session-sync",
      reason: "session-restored",
    });
  }, [syncAllLocalReminderNotifications, timezone, user?.id]);

  const syncAfterMutation = useCallback(
    async ({
      reason,
      scope,
    }: {
      reason: NotificationSyncReason;
      scope: NotificationSyncScope;
    }): Promise<void> => {
      if (!user?.id) {
        return;
      }

      await syncLocalReminderNotifications({
        reason,
        scope,
        timezone,
        userId: user.id,
      });
    },
    [timezone, user?.id]
  );

  const value: NotificationBootstrapContextValue = {
    isPermissionLoading,
    isRequestingPermission,
    openSettings: openNotificationSettings,
    permission,
    refreshPermission,
    requestPermission,
    syncAfterMutation,
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
