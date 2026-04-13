import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";

import {
  SessionProvider,
  useSession,
} from "~/features/session/session-provider";
import { queryClient } from "~/lib/query/query-client";
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
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <StatusBar style="dark" />
          <SplashScreenController />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
