import type { PropsWithChildren } from "react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AppState, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

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
  NotificationSyncError,
  notificationSyncStages,
  syncNotifications as syncDeviceNotifications,
} from "./sync";

const DIAGNOSTICS_STORAGE_KEY = "ttokttak:notification-diagnostics";

const diagnosticsSchema = z.object({
  failure: z
    .object({
      at: z.iso.datetime(),
      stage: z.enum([...notificationSyncStages, "unknown"]),
    })
    .nullable(),
  success: z
    .object({
      at: z.iso.datetime(),
      candidateCount: z.number().int().nonnegative(),
      pendingCount: z.number().int().nonnegative(),
    })
    .nullable(),
});

export type NotificationDiagnostics = z.infer<typeof diagnosticsSchema>;

const initialDiagnostics: NotificationDiagnostics = {
  failure: null,
  success: null,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type NotificationValue = {
  diagnostics: NotificationDiagnostics;
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
  const [diagnostics, setDiagnostics] = useState(initialDiagnostics);
  const [isPermissionLoading, setIsPermissionLoading] = useState(true);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const diagnosticsRef = useRef(initialDiagnostics);
  const diagnosticsOwnerRevisionRef = useRef(0);
  const diagnosticsRevisionRef = useRef(0);
  const diagnosticsStorageRef = useRef(Promise.resolve());
  const previousUserIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    diagnosticsOwnerRevisionRef.current += 1;
  }, [userId]);

  const reportStorageError = useCallback((error: unknown): void => {
    captureException(error, {
      tags: { feature: "notification-diagnostics-storage" },
    });
  }, []);

  const queueDiagnosticsStorage = useCallback(
    (operation: () => Promise<void>): void => {
      diagnosticsStorageRef.current = diagnosticsStorageRef.current
        .then(operation)
        .catch(reportStorageError);
    },
    [reportStorageError]
  );

  const saveDiagnostics = useCallback(
    (next: NotificationDiagnostics): void => {
      diagnosticsRevisionRef.current += 1;
      diagnosticsRef.current = next;
      setDiagnostics(next);
      queueDiagnosticsStorage(() =>
        AsyncStorage.setItem(DIAGNOSTICS_STORAGE_KEY, JSON.stringify(next))
      );
    },
    [queueDiagnosticsStorage]
  );

  const clearDiagnostics = useCallback((): void => {
    diagnosticsRevisionRef.current += 1;
    diagnosticsRef.current = initialDiagnostics;
    setDiagnostics(initialDiagnostics);
    queueDiagnosticsStorage(() =>
      AsyncStorage.removeItem(DIAGNOSTICS_STORAGE_KEY)
    );
  }, [queueDiagnosticsStorage]);

  // 원문 오류나 사용자·일정 식별자를 포함하지 않은 최근 결과만 복원한다.
  useEffect(() => {
    let isMounted = true;

    void AsyncStorage.getItem(DIAGNOSTICS_STORAGE_KEY)
      .then((stored) => {
        if (!isMounted || !stored) {
          return;
        }

        const parsed = diagnosticsSchema.safeParse(JSON.parse(stored));

        if (parsed.success && diagnosticsRevisionRef.current === 0) {
          diagnosticsRef.current = parsed.data;
          setDiagnostics(parsed.data);
        }
      })
      .catch(reportStorageError);

    return () => {
      isMounted = false;
    };
  }, [reportStorageError]);

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

    const ownerRevision = diagnosticsOwnerRevisionRef.current;

    try {
      const result = await syncDeviceNotifications({
        language,
        timezone,
        userId,
      });

      if (result && ownerRevision === diagnosticsOwnerRevisionRef.current) {
        saveDiagnostics({
          ...diagnosticsRef.current,
          success: { ...result, at: new Date().toISOString() },
        });
      }
    } catch (error) {
      if (ownerRevision !== diagnosticsOwnerRevisionRef.current) {
        return;
      }

      saveDiagnostics({
        ...diagnosticsRef.current,
        failure: {
          at: new Date().toISOString(),
          stage:
            error instanceof NotificationSyncError ? error.stage : "unknown",
        },
      });
      throw error;
    }
  }, [language, saveDiagnostics, timezone, userId]);

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
    const previousUserId = previousUserIdRef.current;

    if (previousUserId && previousUserId !== userId) {
      clearDiagnostics();
    }

    previousUserIdRef.current = userId ?? null;

    if (userId) {
      void syncSafely("local-notification-context-sync");
      return;
    }

    void cancelSafely();
  }, [cancelSafely, clearDiagnostics, syncSafely, userId]);

  const value: NotificationValue = {
    diagnostics,
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
