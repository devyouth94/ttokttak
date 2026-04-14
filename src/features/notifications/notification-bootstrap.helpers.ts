import type { AuthChangeEvent } from "@supabase/supabase-js";

import type { NotificationPermissionStatus } from "~/features/notifications/notification-permission";

export type NotificationSyncReason = "app-start" | "session-restored";

export function resolveNotificationSyncReason({
  authEvent,
  hasAppStartSync,
  hasUser,
  lastSessionRestoreRevision,
  permissionStatus,
  sessionRevision,
}: {
  authEvent: AuthChangeEvent | "BOOTSTRAP" | null;
  hasAppStartSync: boolean;
  hasUser: boolean;
  lastSessionRestoreRevision: number | null;
  permissionStatus: NotificationPermissionStatus;
  sessionRevision: number;
}): NotificationSyncReason | null {
  if (!hasUser || permissionStatus !== "granted") {
    return null;
  }

  if (authEvent === "BOOTSTRAP" || authEvent === "INITIAL_SESSION") {
    return hasAppStartSync ? null : "app-start";
  }

  if (authEvent === "SIGNED_IN" || authEvent === "TOKEN_REFRESHED") {
    return lastSessionRestoreRevision === sessionRevision
      ? null
      : "session-restored";
  }

  return null;
}
