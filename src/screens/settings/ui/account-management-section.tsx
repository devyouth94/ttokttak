import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert } from "react-native";

import { AppleAuthRequiredError, LoginRequiredError } from "~/account/delete";
import { useSession } from "~/session/provider";
import { useThemeColors } from "~/theme/provider";

import { SettingsRow, SettingsSectionCard } from "./settings-screen-rows";

type PendingAction = "delete" | "signOut";

export function AccountManagementSection(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const { deleteAccount, signOut } = useSession();

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );

  async function runAction(
    action: PendingAction,
    task: () => Promise<void>
  ): Promise<void> {
    if (pendingAction) {
      return;
    }

    setPendingAction(action);

    try {
      await task();
    } finally {
      setPendingAction(null);
    }
  }

  async function signOutCurrentSession(): Promise<void> {
    await runAction("signOut", async () => {
      try {
        await signOut();
      } catch {
        Alert.alert(
          t("settings.accountManagement.signOutErrorTitle"),
          t("settings.accountManagement.signOutErrorMessage")
        );
      }
    });
  }

  async function deleteCurrentAccount(): Promise<void> {
    await runAction("delete", async () => {
      try {
        await deleteAccount();
      } catch (error) {
        const message =
          error instanceof AppleAuthRequiredError
            ? t(
                "settings.accountManagement.deleteError.appleAuthorizationRequired"
              )
            : error instanceof LoginRequiredError
              ? t("settings.accountManagement.deleteError.sessionRequired")
              : t("settings.accountManagement.deleteError.unknown");

        Alert.alert(t("settings.accountManagement.deleteError.title"), message);
      }
    });
  }

  function requestDeleteAccount(): void {
    if (pendingAction) {
      return;
    }

    Alert.alert(
      t("settings.accountManagement.deleteAlert.title"),
      t("settings.accountManagement.deleteAlert.message"),
      [
        {
          style: "cancel",
          text: t("settings.accountManagement.deleteAlert.cancel"),
        },
        {
          onPress: () => {
            void deleteCurrentAccount();
          },
          style: "destructive",
          text: t("settings.accountManagement.deleteAlert.confirm"),
        },
      ]
    );
  }

  return (
    <SettingsSectionCard title={t("settings.accountManagement.section")}>
      <SettingsRow
        accessory={
          pendingAction === "signOut" ? (
            <ActivityIndicator color={themeColors.textSoft} size="small" />
          ) : undefined
        }
        isDisabled={pendingAction !== null}
        isFirst
        onPress={() => {
          void signOutCurrentSession();
        }}
        title={t("settings.accountManagement.signOut")}
      />
      <SettingsRow
        accessory={
          pendingAction === "delete" ? (
            <ActivityIndicator color={themeColors.error} size="small" />
          ) : undefined
        }
        isDisabled={pendingAction !== null}
        onPress={requestDeleteAccount}
        title={t("settings.accountManagement.delete")}
        tone="danger"
      />
    </SettingsSectionCard>
  );
}
