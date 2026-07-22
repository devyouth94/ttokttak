import { Stack } from "expo-router";

import { AppBootstrap } from "~/application/bootstrap";
import { AppProviders } from "~/application/providers";
import { Sentry } from "~/shared/config/sentry";
import { useThemeColors } from "~/theme/context";

function RootLayout() {
  return (
    <AppProviders>
      <RootStack />
    </AppProviders>
  );
}

function RootStack(): React.JSX.Element {
  const themeColors = useThemeColors();

  return (
    <>
      <AppBootstrap />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: themeColors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}

export default Sentry.wrap(RootLayout);
