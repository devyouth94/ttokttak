import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AccountManagementSection } from "~/screens/settings/ui/account-management-section";
import { AccountSection } from "~/screens/settings/ui/account-section";
import { AppInfoSection } from "~/screens/settings/ui/app-info-section";
import { EnvironmentSection } from "~/screens/settings/ui/environment-section";
import { NotificationsSection } from "~/screens/settings/ui/notifications-section";
import { AppScreen } from "~/ui/app-screen";
import { getMainTabContentBottomInset } from "~/ui/main-bottom-nav";
import { ScreenHeader } from "~/ui/screen-header";
import { spacing } from "~/ui/tokens";

export default function SettingsTabPage(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <AppScreen>
      <ScreenHeader title={t("settings.headerTitle")} />

      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: getMainTabContentBottomInset(insets.bottom),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AccountSection />
        <EnvironmentSection />
        <NotificationsSection />
        <AppInfoSection />
        <AccountManagementSection />
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
  },
});
