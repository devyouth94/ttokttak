import type { PropsWithChildren } from "react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import {
  getCurrentDeviceName,
  getCurrentDevicePlatform,
  getOrCreateNotificationDeviceId,
} from "~/features/notifications/device-identity";
import {
  type NotificationSyncReason,
  resolveNotificationSyncReason,
} from "~/features/notifications/notification-bootstrap.helpers";
import {
  getNotificationPermissionState,
  type NotificationPermissionState,
  openNotificationSettings,
  requestNotificationPermission,
} from "~/features/notifications/notification-permission";
import { upsertDevice } from "~/features/recurring/repositories/devices-repository";
import { useSession } from "~/features/session/session-provider";
import { getErrorMessage } from "~/lib/errors/get-error-message";

type NotificationSyncState = {
  detail: string;
  reason: NotificationSyncReason;
  status: "failed" | "running" | "skipped" | "succeeded";
  updatedAt: string;
};

type NotificationBootstrapContextValue = {
  isPermissionLoading: boolean;
  isRequestingPermission: boolean;
  isSyncing: boolean;
  lastSyncState: NotificationSyncState | null;
  openSettings: () => Promise<void>;
  permission: NotificationPermissionState;
  refreshPermission: () => Promise<NotificationPermissionState>;
  requestPermission: () => Promise<NotificationPermissionState>;
  retrySync: () => Promise<void>;
};

const initialPermissionState: NotificationPermissionState = {
  canOpenSettings: false,
  canRequest: false,
  label: "확인 중",
  status: "undetermined",
};

const NotificationBootstrapContext =
  createContext<NotificationBootstrapContextValue | null>(null);

async function syncNotificationBootstrap(
  userId: string,
  reason: NotificationSyncReason
): Promise<NotificationSyncState> {
  const deviceId = await getOrCreateNotificationDeviceId();

  await upsertDevice({
    deviceName: getCurrentDeviceName(),
    id: deviceId,
    isActive: true,
    lastSeenAt: new Date().toISOString(),
    platform: getCurrentDevicePlatform(),
    userId,
  });

  return {
    detail: "현재 기기 동기화 진입점을 갱신했습니다.",
    reason,
    status: "succeeded",
    updatedAt: new Date().toISOString(),
  };
}

async function runNotificationSync(params: {
  reason: NotificationSyncReason;
  setIsSyncing: (running: boolean) => void;
  setLastSyncState: (state: NotificationSyncState) => void;
  setSyncRunning: (running: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}): Promise<void> {
  const {
    onSuccess,
    reason,
    setIsSyncing,
    setLastSyncState,
    setSyncRunning,
    userId,
  } = params;

  setIsSyncing(true);
  setSyncRunning(true);
  setLastSyncState({
    detail: "현재 기기 동기화 진입점을 확인하고 있습니다.",
    reason,
    status: "running",
    updatedAt: new Date().toISOString(),
  });

  try {
    const result = await syncNotificationBootstrap(userId, reason);

    onSuccess?.();
    setLastSyncState(result);
  } catch (error) {
    setLastSyncState({
      detail: getErrorMessage(error),
      reason,
      status: "failed",
      updatedAt: new Date().toISOString(),
    });
  } finally {
    setIsSyncing(false);
    setSyncRunning(false);
  }
}

export function NotificationBootstrapProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const { authEvent, isLoading, sessionRevision, user } = useSession();
  const [permission, setPermission] = useState<NotificationPermissionState>(
    initialPermissionState
  );
  const [isPermissionLoading, setIsPermissionLoading] = useState(true);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncState, setLastSyncState] =
    useState<NotificationSyncState | null>(null);
  const appStartSyncUserIdRef = useRef<string | null>(null);
  const lastSessionRestoreStateRef = useRef<{
    revision: number;
    userId: string;
  } | null>(null);
  const isSyncRunningRef = useRef(false);

  const setSyncRunning = useCallback((running: boolean) => {
    isSyncRunningRef.current = running;
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
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshPermission]);

  useEffect(() => {
    if (!user?.id) {
      lastSessionRestoreStateRef.current = null;
      return;
    }

    const reason = resolveNotificationSyncReason({
      authEvent,
      hasAppStartSync: appStartSyncUserIdRef.current === user.id,
      hasUser: true,
      lastSessionRestoreRevision:
        lastSessionRestoreStateRef.current?.userId === user.id
          ? lastSessionRestoreStateRef.current.revision
          : null,
      permissionStatus: permission.status,
      sessionRevision,
    });

    if (isLoading || !user?.id || !reason || isSyncRunningRef.current) {
      return;
    }

    void runNotificationSync({
      onSuccess: () => {
        if (reason === "app-start") {
          appStartSyncUserIdRef.current = user.id;
        }

        if (reason === "session-restored") {
          lastSessionRestoreStateRef.current = {
            revision: sessionRevision,
            userId: user.id,
          };
        }
      },
      reason,
      setIsSyncing,
      setLastSyncState,
      setSyncRunning,
      userId: user.id,
    });
  }, [
    authEvent,
    isLoading,
    permission.status,
    sessionRevision,
    setSyncRunning,
    user?.id,
  ]);

  const retrySync = useCallback(async (): Promise<void> => {
    if (
      !user?.id ||
      permission.status !== "granted" ||
      isSyncRunningRef.current
    ) {
      return;
    }

    await runNotificationSync({
      reason: "session-restored",
      setIsSyncing,
      setLastSyncState,
      setSyncRunning,
      userId: user.id,
    });
  }, [permission.status, setSyncRunning, user?.id]);

  const value: NotificationBootstrapContextValue = {
    isPermissionLoading,
    isRequestingPermission,
    isSyncing,
    lastSyncState,
    openSettings: openNotificationSettings,
    permission,
    refreshPermission,
    requestPermission,
    retrySync,
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
      "NotificationBootstrapProvider 내부에서만 useNotificationBootstrap을 사용할 수 있습니다."
    );
  }

  return context;
}
