import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";

import { NotificationBootstrapProvider } from "~/features/notifications/notification-bootstrap";
import {
  getNotificationNavigationKey,
  navigateFromNotificationResponse,
} from "~/features/notifications/notification-response-navigation";
import {
  SessionProvider,
  useSession,
} from "~/features/session/session-provider";
import { queryClient } from "~/lib/query/query-client";
import { Sentry } from "~/lib/sentry";

void SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function SplashScreenController() {
  const { isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return null;
}

function NotificationResponseController(): null {
  useEffect(() => {
    const handledResponseKeys = new Set<string>();

    const handleResponse = (
      response: Notifications.NotificationResponse | null
    ): void => {
      if (!response) {
        return;
      }

      const responseKey = getNotificationNavigationKey(response);

      if (handledResponseKeys.has(responseKey)) {
        return;
      }

      const didNavigate = navigateFromNotificationResponse(response);

      if (!didNavigate) {
        return;
      }

      handledResponseKeys.add(responseKey);
    };

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      handleResponse(response);
      void Notifications.clearLastNotificationResponseAsync();
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleResponse(response);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
}

function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <NotificationBootstrapProvider>
            <StatusBar style="dark" />
            <SplashScreenController />
            <NotificationResponseController />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
            </Stack>
            <PortalHost />
          </NotificationBootstrapProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
