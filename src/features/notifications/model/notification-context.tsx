import type { PropsWithChildren } from "react";
import { createContext, use } from "react";

import type {
  NotificationSyncReason,
  NotificationSyncScope,
} from "~/features/sync-local-notifications";
import type { AppLanguage } from "~/shared/i18n";
import type { NotificationPermissionState } from "~/shared/lib/notifications";

export type NotificationContextValue = {
  isPermissionLoading: boolean;
  isRequestingPermission: boolean;
  openSettings: () => Promise<void>;
  permission: NotificationPermissionState;
  refreshPermission: () => Promise<NotificationPermissionState>;
  requestPermission: () => Promise<NotificationPermissionState>;
  syncAfterAppLanguageChanged: (language: AppLanguage) => Promise<void>;
  syncAfterMutation: (params: {
    reason: NotificationSyncReason;
    scope: NotificationSyncScope;
  }) => Promise<void>;
  syncAfterNotificationTap: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

export function NotificationContextProvider({
  children,
  value,
}: PropsWithChildren<{
  value: NotificationContextValue;
}>): React.JSX.Element {
  return <NotificationContext value={value}>{children}</NotificationContext>;
}

export function useNotifications(): NotificationContextValue {
  const context = use(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications는 NotificationProvider 안에서만 사용할 수 있습니다."
    );
  }

  return context;
}
