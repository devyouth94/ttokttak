import { Stack } from "expo-router";

import { AppBootstrap } from "~/application/bootstrap";
import { AppProviders } from "~/application/providers";
import { mainTabsRootScreenOptions } from "~/features/navigation";
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
