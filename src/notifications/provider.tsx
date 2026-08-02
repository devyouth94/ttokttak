import type { PropsWithChildren } from "react";
import { createContext, use, useCallback, useEffect, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { useAppLanguage } from "~/i18n/provider";
import { captureException } from "~/sentry";

import {
  getPermission,
  type Permission,
  requestPermission as requestDevicePermission,
} from "./permission";
import { NotificationResponse } from "./response";
import {
  cancelNotifications,
  syncNotifications as syncDeviceNotifications,
} from "./sync";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type NotificationValue = {
  isPermissionLoading: boolean;
  isRequestingPermission: boolean;
  openSettings: () => Promise<void>;
  permission: Permission;
  requestPermission: () => Promise<Permission>;
  syncNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationValue | null>(null);

const initialPermission: Permission = {
  canOpenSettings: false,
  canRequest: false,
  status: "undetermined",
};

/**
 * 앱의 알림 권한과 재동기화 lifecycle을 제공한다.
 * 앱 루트에서 세션 사용자와 timezone을 받아 모든 화면을 감싼다.
 */
export function NotificationProvider({
  children,
  timezone,
  userId,
}: PropsWithChildren<{
  timezone: string;
  userId: string | null | undefined;
}>): React.JSX.Element {
  const { language } = useAppLanguage();

  const [permission, setPermission] = useState(initialPermission);
  const [isPermissionLoading, setIsPermissionLoading] = useState(true);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  /** 앱 시작과 foreground 복귀 때 권한 상태를 다시 읽는다. */
  const refreshPermission = useCallback(async (): Promise<Permission> => {
    setIsPermissionLoading(true);

    try {
      const nextPermission = await getPermission();
      setPermission(nextPermission);
      return nextPermission;
    } finally {
      setIsPermissionLoading(false);
    }
  }, []);

  /** 홈과 설정 화면에서 사용자가 알림 권한을 요청할 때 호출한다. */
  const requestPermission = useCallback(async (): Promise<Permission> => {
    setIsRequestingPermission(true);

    try {
      const nextPermission = await requestDevicePermission();
      setPermission(nextPermission);
      return nextPermission;
    } finally {
      setIsRequestingPermission(false);
    }
  }, []);

  /** 현재 사용자 일정과 기기에 예약된 알림을 전체 비교해 다시 맞춘다. */
  const syncNotifications = useCallback(async (): Promise<void> => {
    if (!userId) {
      return;
    }

    await syncDeviceNotifications({ language, timezone, userId });
  }, [language, timezone, userId]);

  /** lifecycle 동기화 실패를 기록하고 사용자 흐름은 계속 진행한다. */
  const syncSafely = useCallback(
    async (feature: string): Promise<void> => {
      try {
        await syncNotifications();
      } catch (error) {
        captureException(error, { tags: { feature } });
      }
    },
    [syncNotifications]
  );

  /** 로그아웃 알림 정리 실패를 기록하고 세션 종료는 계속 진행한다. */
  const cancelSafely = useCallback(async (): Promise<void> => {
    try {
      await cancelNotifications();
    } catch (error) {
      captureException(error, {
        tags: { feature: "local-notification-session-ended-cleanup" },
      });
    }
  }, []);

  // Android에서 알림을 표시할 채널을 앱 시작 시 한 번 준비한다.
  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    void Notifications.setNotificationChannelAsync("reminders", {
      enableVibrate: true,
      importance: Notifications.AndroidImportance.HIGH,
      name: "일정 알림",
      showBadge: true,
      vibrationPattern: [0, 250, 250, 250],
    }).catch((error) => {
      captureException(error, {
        tags: { feature: "notification-channel-bootstrap" },
      });
    });
  }, []);

  // 앱 시작과 foreground 복귀 때 권한과 예약 알림을 최신 상태로 맞춘다.
  useEffect(() => {
    void refreshPermission();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshPermission();
        void syncSafely("local-notification-foreground-sync");
      }
    });

    return () => subscription.remove();
  }, [refreshPermission, syncSafely]);

  // 로그인 상태에서는 전체 동기화하고, 로그아웃 상태에서는 앱 알림을 지운다.
  useEffect(() => {
    if (userId) {
      void syncSafely("local-notification-context-sync");
      return;
    }

    void cancelSafely();
  }, [cancelSafely, syncSafely, userId]);

  const value: NotificationValue = {
    isPermissionLoading,
    isRequestingPermission,
    openSettings: Linking.openSettings,
    permission,
    requestPermission,
    syncNotifications,
  };

  /** 알림 tap 뒤 홈으로 이동한 시점의 예약 알림을 다시 맞춘다. */
  const handleTap = useCallback((): void => {
    void syncSafely("local-notification-tap-sync");
  }, [syncSafely]);

  return (
    <NotificationContext value={value}>
      {children}
      <NotificationResponse onTap={handleTap} />
    </NotificationContext>
  );
}

/** 화면에서 알림 권한과 동기화 함수를 사용한다. */
export function useNotifications(): NotificationValue {
  const context = use(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications는 NotificationProvider 안에서만 사용할 수 있습니다."
    );
  }

  return context;
}
