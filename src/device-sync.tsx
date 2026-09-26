import type { PropsWithChildren } from "react";
import { createContext, use, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";

import {
  clearDeviceOutputs,
  startDeviceSyncSession,
} from "~/device-sync-session";
import { useAppLanguage } from "~/i18n/provider";
import { useNotificationPermission } from "~/notifications/permission";
import { useReminderResponse } from "~/notifications/use-reminder-response";
import { captureException } from "~/sentry";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type DeviceSyncValue = Omit<
  ReturnType<typeof useNotificationPermission>,
  "refreshPermission"
> & {
  syncDeviceOutputs: () => Promise<void>;
};

const DeviceSyncContext = createContext<DeviceSyncValue | null>(null);

/**
 * 앱 이벤트와 일정 변경을 기기 알림·위젯 갱신에 연결한다.
 * 앱 루트에서 세션 사용자와 timezone을 받아 모든 화면을 감싼다.
 */
export function DeviceSyncProvider({
  children,
  timezone,
  userId,
}: PropsWithChildren<{
  timezone: string;
  userId: string | null | undefined;
}>): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const [session, setSession] = useState<ReturnType<
    typeof startDeviceSyncSession
  > | null>(null);

  const {
    refreshPermission,
    requestPermission: requestDevicePermission,
    ...permissionState
  } = useNotificationPermission();

  /** 세션 안에서 데이터를 한 번 준비하고 두 출력을 갱신한다. */
  const syncDeviceOutputs = useCallback(async (): Promise<void> => {
    if (!session?.active || session.userId !== userId) {
      return;
    }

    await session.refresh({ language, timezone });
  }, [language, session, timezone, userId]);

  /** lifecycle 동기화 실패를 기록하고 사용자 흐름은 계속 진행한다. */
  const syncSafely = useCallback(
    async (feature: string): Promise<void> => {
      try {
        await syncDeviceOutputs();
      } catch (error) {
        captureException(error, { tags: { feature } });
      }
    },
    [syncDeviceOutputs]
  );

  /** 허용 직후 다른 앱 이벤트를 기다리지 않고 예약을 만든다. */
  const requestPermission = useCallback(async () => {
    const next = await requestDevicePermission();
    if (next.status === "granted") {
      await syncSafely("local-notification-permission-granted");
    }
    return next;
  }, [requestDevicePermission, syncSafely]);

  /** 로그아웃 알림 정리 실패를 기록하고 세션 종료는 계속 진행한다. */
  const cancelSafely = useCallback(
    async (close = clearDeviceOutputs): Promise<void> => {
      try {
        await close();
      } catch (error) {
        captureException(error, {
          tags: { feature: "local-notification-session-ended-cleanup" },
        });
      }
    },
    []
  );

  // Provider는 세션 수명만 전달하고 병합·무효화·쓰기 순서는 기기 세션이 소유한다.
  useEffect(() => {
    if (!userId) {
      setSession(null);
      void cancelSafely();
      return;
    }
    const next = startDeviceSyncSession(userId);
    setSession(next);
    return () => {
      void cancelSafely(next.close);
    };
  }, [cancelSafely, userId]);

  // Android에서 알림을 표시할 채널을 앱 시작 시 한 번 준비한다.
  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    void Notifications.setNotificationChannelAsync("reminders", {
      enableVibrate: true,
      importance: Notifications.AndroidImportance.HIGH,
      name: t("notifications.channelName"),
      showBadge: true,
      vibrationPattern: [0, 250, 250, 250],
    }).catch((error) => {
      captureException(error, {
        tags: { feature: "notification-channel-bootstrap" },
      });
    });
  }, [t]);

  // foreground 복귀 때 권한과 예약 알림을 최신 상태로 맞춘다.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshPermission();
        void syncSafely("local-notification-foreground-sync");
      }
    });

    return () => subscription.remove();
  }, [refreshPermission, syncSafely]);

  // 로그인 상태에서는 두 출력을 갱신한다. 종료 시 정리는 세션이 소유한다.
  useEffect(() => {
    if (userId) void syncSafely("local-notification-context-sync");
  }, [syncSafely, userId]);

  /** 알림 tap 뒤 홈으로 이동한 시점의 예약 알림을 다시 맞춘다. */
  const handleTap = useCallback((): void => {
    void syncSafely("local-notification-tap-sync");
  }, [syncSafely]);

  useReminderResponse(handleTap);

  const value: DeviceSyncValue = {
    ...permissionState,
    requestPermission,
    syncDeviceOutputs,
  };

  return <DeviceSyncContext value={value}>{children}</DeviceSyncContext>;
}

/** 화면에서 알림 권한과 기기 출력 갱신을 사용한다. */
export function useDeviceSync(): DeviceSyncValue {
  const context = use(DeviceSyncContext);

  if (!context) {
    throw new Error(
      "useDeviceSync는 DeviceSyncProvider 안에서만 사용할 수 있습니다."
    );
  }

  return context;
}
