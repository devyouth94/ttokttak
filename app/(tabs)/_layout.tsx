import { StyleSheet, View } from "react-native";
import { Redirect, Tabs, usePathname } from "expo-router";

import { useSession } from "~/application/session";
import { MainBottomNav, shouldShowMainBottomNav } from "~/features/navigation";
import { colors } from "~/shared/ui/tokens";

export default function TabsLayout(): React.JSX.Element {
  const { isAuthenticated, isLoading } = useSession();
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
      <Tabs.Screen name="home" options={{ title: "홈" }} />
      <Tabs.Screen name="schedule" options={{ title: "목록" }} />
      <Tabs.Screen name="calendar" options={{ title: "캘린더" }} />
      <Tabs.Screen name="settings" options={{ title: "설정" }} />
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
