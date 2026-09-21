import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";

import { useSession } from "~/session/provider";
import { useTheme } from "~/theme/provider";
import { FloatingCreateButton } from "~/ui/floating-create-button";
import { MainBottomNav } from "~/ui/main-bottom-nav";

export default function TabsLayout(): React.JSX.Element {
  const { t } = useTranslation();

  const { status } = useSession();
  const { colors: themeColors, resolvedTheme } = useTheme();

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

  if (Platform.OS === "ios") {
    const baseNavigationTheme =
      resolvedTheme === "dark" ? DarkTheme : DefaultTheme;

    return (
      <NavigationThemeProvider
        value={{
          ...baseNavigationTheme,
          colors: {
            ...baseNavigationTheme.colors,
            background: themeColors.background,
            card: themeColors.surface,
            primary: themeColors.primary,
            text: themeColors.text,
          },
        }}
      >
        <View style={styles.nativeTabs}>
          <NativeTabs
            backBehavior="none"
            iconColor={themeColors.textSoft}
            labelStyle={{ color: themeColors.textSoft }}
            minimizeBehavior="never"
            tintColor={themeColors.primary}
          >
            <NativeTabs.Trigger disablePopToTop disableScrollToTop name="home">
              <NativeTabs.Trigger.Icon
                sf={{ default: "house", selected: "house.fill" }}
              />
              <NativeTabs.Trigger.Label>
                {t("navigation.tabs.home")}
              </NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
              disablePopToTop
              disableScrollToTop
              name="schedule"
            >
              <NativeTabs.Trigger.Icon sf="list.bullet" />
              <NativeTabs.Trigger.Label>
                {t("navigation.tabs.schedule")}
              </NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
              disablePopToTop
              disableScrollToTop
              name="calendar"
            >
              <NativeTabs.Trigger.Icon sf="calendar" />
              <NativeTabs.Trigger.Label>
                {t("navigation.tabs.calendar")}
              </NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger
              disablePopToTop
              disableScrollToTop
              name="settings"
            >
              <NativeTabs.Trigger.Icon
                sf={{ default: "gearshape", selected: "gearshape.fill" }}
              />
              <NativeTabs.Trigger.Label>
                {t("navigation.tabs.settings")}
              </NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
          </NativeTabs>

          <FloatingCreateButton />
        </View>
      </NavigationThemeProvider>
    );
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
  nativeTabs: {
    flex: 1,
  },
});
