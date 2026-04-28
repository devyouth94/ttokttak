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

import { getOrCreateNotificationDeviceId } from "~/features/notifications/device-identity";
import {
  addCurrentDevicePushTokenListener,
  type CurrentDevicePushToken,
  getCurrentDevicePushToken,
} from "~/features/notifications/device-push-token";
import {
  createCurrentDevicePushTokenRegistration,
  type CurrentDevicePushTokenRegistration,
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
import {
  isSamePushTokenRegistration,
  shouldSkipListenerPushTokenRegistration,
} from "~/features/notifications/notification-push-token-sync-guard";
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

type PushTokenSyncTrigger = "session" | "token-listener";

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
  const inFlightPushTokenRegistrationRef =
    useRef<CurrentDevicePushTokenRegistration | null>(null);
  const inFlightSessionPushTokenSyncKeyRef = useRef<string | null>(null);
  const lastSessionPushTokenSyncKeyRef = useRef<string | null>(null);
  const lastSuccessfulPushTokenRegistrationRef =
    useRef<CurrentDevicePushTokenRegistration | null>(null);
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
    async ({
      currentDevicePushToken,
      trigger,
      userId,
    }: {
      currentDevicePushToken?: CurrentDevicePushToken;
      trigger: PushTokenSyncTrigger;
      userId: string;
    }): Promise<void> => {
      const sessionSyncKey = userId;
      let didMarkSessionInFlight = false;
      let markedPushTokenRegistration: CurrentDevicePushTokenRegistration | null =
        null;

      if (
        trigger === "session" &&
        (lastSessionPushTokenSyncKeyRef.current === sessionSyncKey ||
          inFlightSessionPushTokenSyncKeyRef.current === sessionSyncKey)
      ) {
        return;
      }

      if (trigger === "session") {
        inFlightSessionPushTokenSyncKeyRef.current = sessionSyncKey;
        didMarkSessionInFlight = true;
      }

      try {
        const deviceId = await getOrCreateNotificationDeviceId();
        const resolvedDevicePushToken =
          currentDevicePushToken ?? (await getCurrentDevicePushToken());

        if (!resolvedDevicePushToken) {
          return;
        }

        const candidateRegistration = createCurrentDevicePushTokenRegistration({
          currentDevicePushToken: resolvedDevicePushToken,
          deviceId,
          userId,
        });

        if (
          trigger === "token-listener" &&
          shouldSkipListenerPushTokenRegistration({
            candidate: candidateRegistration,
            inFlightRegistration: inFlightPushTokenRegistrationRef.current,
            lastSuccessfulRegistration:
              lastSuccessfulPushTokenRegistrationRef.current,
          })
        ) {
          return;
        }

        if (
          isSamePushTokenRegistration(
            candidateRegistration,
            inFlightPushTokenRegistrationRef.current
          )
        ) {
          return;
        }

        inFlightPushTokenRegistrationRef.current = candidateRegistration;
        markedPushTokenRegistration = candidateRegistration;

        const completedRegistration = await registerCurrentDevicePushToken({
          currentDevicePushToken: resolvedDevicePushToken,
          deviceId,
          userId,
        });

        if (completedRegistration) {
          lastSuccessfulPushTokenRegistrationRef.current =
            completedRegistration;

          if (trigger === "session") {
            lastSessionPushTokenSyncKeyRef.current = sessionSyncKey;
          }
        }
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            feature: "notification-push-token-registration",
          },
        });
      } finally {
        if (
          didMarkSessionInFlight &&
          inFlightSessionPushTokenSyncKeyRef.current === sessionSyncKey
        ) {
          inFlightSessionPushTokenSyncKeyRef.current = null;
        }

        if (
          isSamePushTokenRegistration(
            markedPushTokenRegistration,
            inFlightPushTokenRegistrationRef.current
          )
        ) {
          inFlightPushTokenRegistrationRef.current = null;
        }
      }
    },
    []
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
    inFlightPushTokenRegistrationRef.current = null;
    inFlightSessionPushTokenSyncKeyRef.current = null;
    lastSessionPushTokenSyncKeyRef.current = null;
    lastSuccessfulPushTokenRegistrationRef.current = null;

    void deactivatePushToken(signedOutUserId, "logout");
  }, [authEvent, deactivatePushToken, user?.id]);

  useEffect(() => {
    if (isLoading || !user?.id || permission.status !== "granted") {
      return;
    }

    void syncPushToken({
      trigger: "session",
      userId: user.id,
    });
  }, [isLoading, permission.status, sessionRevision, syncPushToken, user?.id]);

  useEffect(() => {
    if (!user?.id || permission.status !== "granted") {
      return;
    }

    const subscription = addCurrentDevicePushTokenListener(
      (currentDevicePushToken) =>
        syncPushToken({
          currentDevicePushToken,
          trigger: "token-listener",
          userId: user.id,
        })
    );

    return () => {
      subscription?.remove();
    };
  }, [permission.status, syncPushToken, user?.id]);

  useEffect(() => {
    if (!user?.id || permission.status !== "denied") {
      return;
    }

    inFlightPushTokenRegistrationRef.current = null;
    inFlightSessionPushTokenSyncKeyRef.current = null;
    lastSessionPushTokenSyncKeyRef.current = null;
    lastSuccessfulPushTokenRegistrationRef.current = null;
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
