import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Slot, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";

import {
  SessionProvider,
  useSession,
} from "~/features/session/session-provider";
import { Sentry } from "~/lib/sentry";

void SplashScreen.preventAutoHideAsync();

function SplashScreenController() {
  const { isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return null;
}

function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <SplashScreenController />
        <Slot />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
