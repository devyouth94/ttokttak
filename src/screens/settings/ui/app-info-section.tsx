import { useTranslation } from "react-i18next";
import { Alert, Linking } from "react-native";
import Constants from "expo-constants";
import { ExternalLink } from "lucide-react-native";

import { PRIVACY_POLICY_URL, SUPPORT_URL, TERMS_OF_SERVICE_URL } from "~/legal";
import { useThemeColors } from "~/theme/provider";

import {
  SettingsRow,
  SettingsSectionCard,
  SettingsValueRow,
} from "./settings-screen-rows";

export function AppInfoSection(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  async function openExternalDocument(
    url: string,
    titleKey: string,
    messageKey: string
  ): Promise<void> {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t(titleKey), t(messageKey));
    }
  }

  return (
    <SettingsSectionCard title={t("settings.appInfo.section")}>
      <SettingsValueRow
        isFirst
        title={t("settings.appInfo.version")}
        value={`v${appVersion}`}
      />
      <SettingsRow
        accessory={<ExternalLink color={themeColors.textSoft} size={16} />}
        onPress={() => {
          void openExternalDocument(
            SUPPORT_URL,
            "settings.appInfo.supportOpenErrorTitle",
            "settings.appInfo.supportOpenErrorMessage"
          );
        }}
        title={t("settings.appInfo.support")}
      />
      <SettingsRow
        accessory={<ExternalLink color={themeColors.textSoft} size={16} />}
        onPress={() => {
          void openExternalDocument(
            TERMS_OF_SERVICE_URL,
            "settings.appInfo.termsOpenErrorTitle",
            "settings.appInfo.termsOpenErrorMessage"
          );
        }}
        title={t("settings.appInfo.terms")}
      />
      <SettingsRow
        accessory={<ExternalLink color={themeColors.textSoft} size={16} />}
        onPress={() => {
          void openExternalDocument(
            PRIVACY_POLICY_URL,
            "settings.appInfo.privacyOpenErrorTitle",
            "settings.appInfo.privacyOpenErrorMessage"
          );
        }}
        title={t("settings.appInfo.privacyPolicy")}
      />
    </SettingsSectionCard>
  );
}
