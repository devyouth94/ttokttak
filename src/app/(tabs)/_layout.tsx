import { StyleSheet, View } from "react-native";
import { Redirect, Tabs, usePathname } from "expo-router";

import { colors } from "~/design-system/tokens";
import { MainTabShell } from "~/features/navigation/components/main-tab-shell";
import { useSession } from "~/features/session/session-provider";

const TAB_ROOT_PATHS = new Set([
  "/home",
  "/calendar",
  "/schedule",
  "/settings",
]);

export default function TabsLayout(): React.JSX.Element {
  const { isAuthenticated, isLoading } = useSession();
  const pathname = usePathname();
  const showBottomNav = TAB_ROOT_PATHS.has(pathname);

  if (isLoading) {
    return <View style={styles.loadingScreen} />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <MainTabShell showBottomNav={showBottomNav}>
      <Tabs
        backBehavior="none"
        initialRouteName="home"
        screenOptions={{
          headerShown: false,
          sceneStyle: styles.scene,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="home" options={{ title: "홈" }} />
        <Tabs.Screen name="schedule" options={{ title: "목록" }} />
        <Tabs.Screen name="calendar" options={{ title: "캘린더" }} />
        <Tabs.Screen name="settings" options={{ title: "설정" }} />
      </Tabs>
    </MainTabShell>
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
