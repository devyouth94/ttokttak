import { useCallback, useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";

import { syncLocalReminderNotifications } from "~/features/notifications/local-notification-sync";
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
  const { profile, user } = useSession();
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const handledResponseKeysRef = useRef<Set<string>>(new Set());
  const hasPendingTapSyncRef = useRef(false);

  const syncAfterNotificationTap = useCallback((): void => {
    if (!user?.id) {
      hasPendingTapSyncRef.current = true;
      return;
    }

    hasPendingTapSyncRef.current = false;

    void syncLocalReminderNotifications({
      reason: "notification-tapped",
      scope: { type: "all" },
      timezone,
      userId: user.id,
    }).catch((error) => {
      Sentry.captureException(error, {
        tags: {
          feature: "local-notification-tap-sync",
        },
      });
    });
  }, [timezone, user?.id]);

  useEffect(() => {
    if (hasPendingTapSyncRef.current && user?.id) {
      syncAfterNotificationTap();
    }
  }, [syncAfterNotificationTap, user?.id]);

  useEffect(() => {
    const handleResponse = (
      response: Notifications.NotificationResponse | null
    ): void => {
      if (!response) {
        return;
      }

      const responseKey = getNotificationNavigationKey(response);

      if (handledResponseKeysRef.current.has(responseKey)) {
        return;
      }

      const didNavigate = navigateFromNotificationResponse(response);

      if (!didNavigate) {
        return;
      }

      handledResponseKeysRef.current.add(responseKey);
      syncAfterNotificationTap();
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
  }, [syncAfterNotificationTap]);

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
