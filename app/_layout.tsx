import { Stack } from "expo-router";

import { AppBootstrap } from "~/application/bootstrap/app-bootstrap";
import { AppProviders } from "~/application/providers/app-providers";
import { mainTabsRootScreenOptions } from "~/features/navigation/main-navigation-options";
import { Sentry } from "~/shared/config/sentry";

function RootLayout() {
  return (
    <AppProviders>
      <AppBootstrap />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={mainTabsRootScreenOptions} />
      </Stack>
    </AppProviders>
  );
}

export default Sentry.wrap(RootLayout);
