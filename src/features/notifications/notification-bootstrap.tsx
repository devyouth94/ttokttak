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

import { resolveNotificationSyncReason } from "~/features/notifications/notification-bootstrap.helpers";
import {
  getNotificationPermissionState,
  type NotificationPermissionState,
  openNotificationSettings,
  requestNotificationPermission,
} from "~/features/notifications/notification-permission";
import { syncCurrentDeviceNotifications } from "~/features/notifications/notification-sync";
import type {
  NotificationSyncReason,
  NotificationSyncScope,
} from "~/features/notifications/notification-sync.helpers";
import { useSession } from "~/features/session/session-provider";
import { getErrorMessage } from "~/lib/errors/get-error-message";

type NotificationSyncState = {
  detail: string;
  reason: NotificationSyncReason;
  status: "failed" | "running" | "skipped" | "succeeded";
  updatedAt: string;
};

type MutationNotificationSyncReason =
  | "item-archived"
  | "item-created"
  | "item-updated"
  | "occurrence-completed"
  | "occurrence-skipped";

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
  syncAfterMutation: (params: {
    reason: MutationNotificationSyncReason;
    scope: NotificationSyncScope;
  }) => Promise<void>;
};

const initialPermissionState: NotificationPermissionState = {
  canOpenSettings: false,
  canRequest: false,
  label: "확인 중",
  status: "undetermined",
};

const NotificationBootstrapContext =
  createContext<NotificationBootstrapContextValue | null>(null);

async function syncNotifications(params: {
  reason: NotificationSyncReason;
  scope: NotificationSyncScope;
  timezone: string;
  userId: string;
}): Promise<NotificationSyncState> {
  const result = await syncCurrentDeviceNotifications(params);

  return {
    detail: result.detail,
    reason: result.reason,
    status: "succeeded",
    updatedAt: new Date().toISOString(),
  };
}

async function runNotificationSync(params: {
  reason: NotificationSyncReason;
  setIsSyncing: (running: boolean) => void;
  setLastSyncState: (state: NotificationSyncState) => void;
  setSyncRunning: (running: boolean) => void;
  scope: NotificationSyncScope;
  timezone: string;
  userId: string;
  onSuccess?: () => void;
}): Promise<void> {
  const {
    onSuccess,
    reason,
    scope,
    setIsSyncing,
    setLastSyncState,
    setSyncRunning,
    timezone,
    userId,
  } = params;

  setIsSyncing(true);
  setSyncRunning(true);
  setLastSyncState({
    detail: "현재 기기 알림을 다시 맞추고 있습니다.",
    reason,
    status: "running",
    updatedAt: new Date().toISOString(),
  });

  try {
    const result = await syncNotifications({
      reason,
      scope,
      timezone,
      userId,
    });

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
  const { authEvent, isLoading, profile, sessionRevision, user } = useSession();
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
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

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
      scope: { type: "all" },
      setIsSyncing,
      setLastSyncState,
      setSyncRunning,
      timezone,
      userId: user.id,
    });
  }, [
    authEvent,
    isLoading,
    permission.status,
    sessionRevision,
    setSyncRunning,
    timezone,
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
      scope: { type: "all" },
      setIsSyncing,
      setLastSyncState,
      setSyncRunning,
      timezone,
      userId: user.id,
    });
  }, [permission.status, setSyncRunning, timezone, user?.id]);

  const syncAfterMutation = useCallback(
    async ({
      reason,
      scope,
    }: {
      reason: MutationNotificationSyncReason;
      scope: NotificationSyncScope;
    }): Promise<void> => {
      if (
        !user?.id ||
        permission.status !== "granted" ||
        isSyncRunningRef.current
      ) {
        return;
      }

      await runNotificationSync({
        reason,
        scope,
        setIsSyncing,
        setLastSyncState,
        setSyncRunning,
        timezone,
        userId: user.id,
      });
    },
    [permission.status, setSyncRunning, timezone, user?.id]
  );

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
