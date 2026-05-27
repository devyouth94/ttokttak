import { Stack } from "expo-router";

import { AppBootstrap } from "~/application/bootstrap";
import { mainTabsRootScreenOptions } from "~/application/navigation";
import { AppProviders } from "~/application/providers";
import { Sentry } from "~/shared/config/sentry";
import { useAppThemeColors } from "~/shared/theme";

function RootLayout() {
  return (
    <AppProviders>
      <RootStack />
    </AppProviders>
  );
}

function RootStack(): React.JSX.Element {
  const themeColors = useAppThemeColors();

  return (
    <>
      <AppBootstrap />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: themeColors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={mainTabsRootScreenOptions} />
      </Stack>
    </>
  );
}

export default Sentry.wrap(RootLayout);
