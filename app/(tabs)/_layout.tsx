import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Redirect, Tabs } from "expo-router";

import { MainBottomNav } from "~/application/navigation";
import { useSession } from "~/session/provider";
import { useThemeColors } from "~/theme/provider";

export default function TabsLayout(): React.JSX.Element {
  const { t } = useTranslation();

  const { status } = useSession();
  const themeColors = useThemeColors();

  if (status === "loading") {
    return (
      <View
        style={[
          styles.loadingScreen,
          { backgroundColor: themeColors.background },
        ]}
      />
    );
  }

  if (status === "signedOut") {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      backBehavior="none"
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: themeColors.background },
      }}
      tabBar={(props) => <MainBottomNav {...props} />}
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
});
