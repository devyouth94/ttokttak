import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert } from "react-native";
import { ExternalLink } from "lucide-react-native";

import { useAppLanguage } from "~/i18n/provider";
import type { Permission } from "~/notifications/permission";
import { useNotifications } from "~/notifications/provider";
import type { NotificationSyncStage } from "~/notifications/sync";
import { formatTimestamp } from "~/schedule/display/date";
import { useSession } from "~/session/provider";
import { useThemeColors } from "~/theme/provider";

import {
  SettingsRow,
  SettingsSectionCard,
  SettingsValueRow,
} from "./settings-screen-rows";

export function NotificationsSection(): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const { profile } = useSession();
  const themeColors = useThemeColors();
  const {
    diagnostics,
    isPermissionLoading,
    isRequestingPermission,
    openSettings,
    permission,
    requestPermission,
  } = useNotifications();
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const permissionStatus = isPermissionLoading
    ? t("settings.notifications.statusChecking")
    : getPermissionStatusText(permission.status, t);

  async function openSystemSettings(): Promise<void> {
    try {
      await openSettings();
    } catch {
      Alert.alert(
        t("settings.notifications.openSettingsErrorTitle"),
        t("settings.notifications.openSettingsErrorMessage")
      );
    }
  }

  async function requestNotificationPermission(): Promise<void> {
    try {
      await requestPermission();
    } catch {
      Alert.alert(
        t("settings.notifications.permissionRequestErrorTitle"),
        t("settings.notifications.permissionRequestErrorMessage")
      );
    }
  }

  return (
    <SettingsSectionCard title={t("settings.notifications.section")}>
      <SettingsValueRow
        isFirst
        title={t("settings.notifications.permissionStatus")}
        value={permissionStatus}
      />
      {diagnostics.success && (
        <SettingsValueRow
          title={t("settings.notifications.lastSuccess")}
          value={t("settings.notifications.successSummary", {
            candidateCount: diagnostics.success.candidateCount,
            pendingCount: diagnostics.success.pendingCount,
            time: formatDiagnosticTime(
              diagnostics.success.at,
              timezone,
              language
            ),
          })}
        />
      )}
      {diagnostics.failure && (
        <SettingsValueRow
          title={t("settings.notifications.lastFailure")}
          value={t("settings.notifications.failureSummary", {
            recovered:
              diagnostics.success &&
              diagnostics.success.at > diagnostics.failure.at
                ? t("settings.notifications.recoveredSuffix")
                : "",
            stage: getFailureStageText(diagnostics.failure.stage, t),
            time: formatDiagnosticTime(
              diagnostics.failure.at,
              timezone,
              language
            ),
          })}
        />
      )}
      {permission.canRequest && (
        <SettingsRow
          accessory={
            isRequestingPermission ? (
              <ActivityIndicator color={themeColors.textSoft} size="small" />
            ) : (
              <ExternalLink color={themeColors.textSoft} size={16} />
            )
          }
          description={t("settings.notifications.permissionRequestDescription")}
          isDisabled={isRequestingPermission}
          onPress={() => {
            void requestNotificationPermission();
          }}
          title={t("settings.notifications.permissionRequest")}
        />
      )}
      {permission.canOpenSettings && (
        <SettingsRow
          accessory={<ExternalLink color={themeColors.textSoft} size={16} />}
          description={t("settings.notifications.openSettingsDescription")}
          onPress={() => {
            void openSystemSettings();
          }}
          title={t("settings.notifications.openSettings")}
        />
      )}
    </SettingsSectionCard>
  );
}

function formatDiagnosticTime(
  at: string,
  timezone: string,
  language: "ko" | "en"
): string {
  return `${formatTimestamp(at, timezone, "date", language)} ${formatTimestamp(
    at,
    timezone,
    "time",
    language
  )}`;
}

function getFailureStageText(
  stage: NotificationSyncStage | "unknown",
  t: (key: string) => string
): string {
  switch (stage) {
    case "permission":
      return t("settings.notifications.stagePermission");
    case "items":
      return t("settings.notifications.stageItems");
    case "logs":
      return t("settings.notifications.stageLogs");
    case "candidates":
      return t("settings.notifications.stageCandidates");
    case "list-scheduled":
      return t("settings.notifications.stageListScheduled");
    case "cancel":
      return t("settings.notifications.stageCancel");
    case "schedule":
      return t("settings.notifications.stageSchedule");
    case "verify":
      return t("settings.notifications.stageVerify");
    default:
      return t("settings.notifications.stageUnknown");
  }
}

function getPermissionStatusText(
  status: Permission["status"],
  t: (key: string) => string
): string {
  switch (status) {
    case "granted":
      return t("settings.notifications.statusGranted");
    case "undetermined":
      return t("settings.notifications.statusUndetermined");
    case "unsupported":
      return t("settings.notifications.statusUnsupported");
    default:
      return t("settings.notifications.statusDenied");
  }
}
