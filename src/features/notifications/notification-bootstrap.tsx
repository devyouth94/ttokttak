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

import { addCurrentDevicePushTokenListener } from "~/features/notifications/device-push-token";
import {
  deactivateCurrentDevicePushTokens,
  registerCurrentDevicePushToken,
} from "~/features/notifications/device-push-token-registration";
import { syncRemoteNotificationDeliveryJobs } from "~/features/notifications/notification-delivery-sync";
import {
  type NotificationDeliverySyncReason,
  type NotificationDeliverySyncScope,
} from "~/features/notifications/notification-delivery-sync.types";
import {
  getNotificationPermissionState,
  type NotificationPermissionState,
  openNotificationSettings,
  requestNotificationPermission,
} from "~/features/notifications/notification-permission";
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
    reason: NotificationDeliverySyncReason;
    scope: NotificationDeliverySyncScope;
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
      name: "리마인더",
      showBadge: true,
      vibrationPattern: [0, 250, 250, 250],
    }
  );
}

export function NotificationBootstrapProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const { authEvent, isLoading, profile, sessionRevision, user } = useSession();
  const [permission, setPermission] = useState<NotificationPermissionState>(
    initialPermissionState
  );
  const [isPermissionLoading, setIsPermissionLoading] = useState(true);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const lastPushTokenSyncKeyRef = useRef<string | null>(null);
  const lastSignedInUserIdRef = useRef<string | null>(null);
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

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

  const syncPushToken = useCallback(
    async (userId: string): Promise<void> => {
      try {
        await registerCurrentDevicePushToken(userId);
        lastPushTokenSyncKeyRef.current = `${userId}:${sessionRevision}`;
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            feature: "notification-push-token-registration",
          },
        });
      }
    },
    [sessionRevision]
  );

  const deactivatePushToken = useCallback(
    async (
      userId: string,
      reason: "logout" | "permission-denied"
    ): Promise<void> => {
      try {
        await deactivateCurrentDevicePushTokens(userId, reason);
      } catch {
        // 비활성화 실패는 다음 세션 복원 시 다시 정리한다.
      }
    },
    []
  );

  useEffect(() => {
    void refreshPermission();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refreshPermission();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshPermission]);

  useEffect(() => {
    if (user?.id) {
      lastSignedInUserIdRef.current = user.id;
      return;
    }

    if (authEvent !== "SIGNED_OUT" || !lastSignedInUserIdRef.current) {
      return;
    }

    const signedOutUserId = lastSignedInUserIdRef.current;
    lastSignedInUserIdRef.current = null;
    lastPushTokenSyncKeyRef.current = null;

    void deactivatePushToken(signedOutUserId, "logout");
  }, [authEvent, deactivatePushToken, user?.id]);

  useEffect(() => {
    if (isLoading || !user?.id || permission.status !== "granted") {
      return;
    }

    const nextSyncKey = `${user.id}:${sessionRevision}`;

    if (lastPushTokenSyncKeyRef.current === nextSyncKey) {
      return;
    }

    void syncPushToken(user.id);
  }, [isLoading, permission.status, sessionRevision, syncPushToken, user?.id]);

  useEffect(() => {
    if (!user?.id || permission.status !== "granted") {
      return;
    }

    const subscription = addCurrentDevicePushTokenListener(() => {
      return syncPushToken(user.id);
    });

    return () => {
      subscription?.remove();
    };
  }, [permission.status, syncPushToken, user?.id]);

  useEffect(() => {
    if (!user?.id || permission.status !== "denied") {
      return;
    }

    lastPushTokenSyncKeyRef.current = null;
    void deactivatePushToken(user.id, "permission-denied");
  }, [deactivatePushToken, permission.status, user?.id]);

  const syncAfterMutation = useCallback(
    async ({
      reason,
      scope,
    }: {
      reason: NotificationDeliverySyncReason;
      scope: NotificationDeliverySyncScope;
    }): Promise<void> => {
      if (!user?.id) {
        return;
      }

      await syncRemoteNotificationDeliveryJobs({
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
