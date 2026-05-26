import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Redirect, Tabs, usePathname } from "expo-router";

import {
  MainBottomNav,
  shouldShowMainBottomNav,
} from "~/application/navigation";
import { useSession } from "~/application/session";
import { colors } from "~/shared/ui/tokens";

export default function TabsLayout(): React.JSX.Element {
  const { isAuthenticated, isLoading } = useSession();
  const { t } = useTranslation();
  const pathname = usePathname();
  const showBottomNav = shouldShowMainBottomNav(pathname);

  if (isLoading) {
    return <View style={styles.loadingScreen} />;
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
        sceneStyle: styles.scene,
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
    backgroundColor: colors.background,
  },
  scene: {
    backgroundColor: colors.background,
  },
});
