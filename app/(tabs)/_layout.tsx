import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Redirect, Tabs, usePathname } from "expo-router";

import {
  MainBottomNav,
  shouldShowMainBottomNav,
} from "~/application/navigation";
import { useSession } from "~/application/session";
import { useAppThemeColors } from "~/shared/theme/theme-context";

export default function TabsLayout(): React.JSX.Element {
  const { isAuthenticated, isLoading } = useSession();
  const { t } = useTranslation();
  const themeColors = useAppThemeColors();
  const pathname = usePathname();
  const showBottomNav = shouldShowMainBottomNav(pathname);

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingScreen,
          { backgroundColor: themeColors.background },
        ]}
      />
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      backBehavior="none"
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        sceneStyle: [styles.scene, { backgroundColor: themeColors.background }],
      }}
      tabBar={(props) => <MainBottomNav {...props} isVisible={showBottomNav} />}
    >
      <Tabs.Screen name="home" options={{ title: t("navigation.tabs.home") }} />
      <Tabs.Screen
        name="schedule"
        options={{ title: t("navigation.tabs.schedule") }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: t("navigation.tabs.calendar") }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t("navigation.tabs.settings") }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
  },
  scene: {},
});
