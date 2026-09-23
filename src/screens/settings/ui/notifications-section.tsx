import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert } from "react-native";
import { ExternalLink } from "lucide-react-native";

import { useDeviceSync } from "~/device-sync";
import type { Permission } from "~/notifications/permission";
import { useThemeColors } from "~/theme/provider";

import {
  SettingsRow,
  SettingsSectionCard,
  SettingsValueRow,
} from "./settings-screen-rows";

export function NotificationsSection(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const {
    isPermissionLoading,
    isRequestingPermission,
    openSettings,
    permission,
    requestPermission,
  } = useDeviceSync();
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
