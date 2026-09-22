import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

import type { AppLanguage } from "~/i18n/language";
import { useAppLanguage } from "~/i18n/provider";
import { useSession } from "~/session/provider";
import type { ThemePreference } from "~/theme/preference";
import { useTheme } from "~/theme/provider";
import type { SelectOption } from "~/ui/select-menu";
import { SelectMenu } from "~/ui/select-menu";
import { spacing } from "~/ui/tokens";

import {
  SettingsRow,
  SettingsSectionCard,
  SettingsValueRow,
} from "./settings-screen-rows";
import { usePendingAction } from "../use-pending-action";

type PendingAction = "language" | "theme";

export function EnvironmentSection(): React.JSX.Element {
  const { t } = useTranslation();
  const { language: appLanguage, setLanguage } = useAppLanguage();
  const { profile } = useSession();
  const {
    colors: themeColors,
    setThemePreference,
    themePreference,
  } = useTheme();

  const { pendingAction, runAction } = usePendingAction<PendingAction>();

  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const languageOptions = [
    {
      accessibilityHint: t("settings.environment.languageKoreanHint"),
      label: "한국어",
      value: "ko",
    },
    {
      accessibilityHint: t("settings.environment.languageEnglishHint"),
      label: "English",
      value: "en",
    },
  ] satisfies SelectOption<AppLanguage>[];

  const themeOptions = [
    {
      accessibilityHint: t("settings.environment.themeSystemHint"),
      label: t("settings.environment.themeSystem"),
      value: "system",
    },
    {
      accessibilityHint: t("settings.environment.themeLightHint"),
      label: t("settings.environment.themeLight"),
      value: "light",
    },
    {
      accessibilityHint: t("settings.environment.themeDarkHint"),
      label: t("settings.environment.themeDark"),
      value: "dark",
    },
  ] satisfies SelectOption<ThemePreference>[];

  async function changeLanguage(nextLanguage: AppLanguage): Promise<void> {
    if (nextLanguage === appLanguage) {
      return;
    }

    await runAction("language", async () => {
      try {
        await setLanguage(nextLanguage);
      } catch {
        Alert.alert(
          t("settings.environment.saveErrorTitle"),
          t("settings.environment.saveErrorMessage")
        );
      }
    });
  }

  async function changeTheme(nextPreference: ThemePreference): Promise<void> {
    if (nextPreference === themePreference) {
      return;
    }

    await runAction("theme", async () => {
      try {
        await setThemePreference(nextPreference);
      } catch {
        Alert.alert(
          t("settings.environment.themeSaveErrorTitle"),
          t("settings.environment.themeSaveErrorMessage")
        );
      }
    });
  }

  return (
    <SettingsSectionCard title={t("settings.environment.section")}>
      <SettingsRow
        accessory={
          <View style={styles.selectAccessory}>
            {pendingAction === "language" && (
              <ActivityIndicator color={themeColors.textSoft} size="small" />
            )}
            <SelectMenu
              accessibilityHint={t("settings.environment.appLanguageHint")}
              accessibilityLabel={t("settings.environment.appLanguage")}
              disabled={pendingAction !== null}
              onChange={(nextLanguage) => {
                void changeLanguage(nextLanguage);
              }}
              options={languageOptions}
              value={appLanguage}
            />
          </View>
        }
        isFirst
        title={t("settings.environment.appLanguage")}
      />

      <SettingsRow
        accessory={
          <View style={styles.selectAccessory}>
            {pendingAction === "theme" && (
              <ActivityIndicator color={themeColors.textSoft} size="small" />
            )}
            <SelectMenu
              accessibilityHint={t("settings.environment.themeHint")}
              accessibilityLabel={t("settings.environment.theme")}
              disabled={pendingAction !== null}
              onChange={(nextPreference) => {
                void changeTheme(nextPreference);
              }}
              options={themeOptions}
              value={themePreference}
            />
          </View>
        }
        title={t("settings.environment.theme")}
      />

      <SettingsValueRow
        title={t("settings.environment.timezone")}
        value={timezone}
      />
    </SettingsSectionCard>
  );
}

const styles = StyleSheet.create({
  selectAccessory: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
});
