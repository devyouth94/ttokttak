import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { SplashScreen } from "expo-router";

import { useSession } from "~/application/session";
import { useNotifications } from "~/features/notifications/notification-provider";
import {
  getNotificationNavigationKey,
  navigateFromNotificationResponse,
} from "~/features/notifications/notification-response-navigation";

void SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function AppBootstrap(): React.JSX.Element {
  return (
    <>
      <SplashScreenController />
      <NotificationResponseController />
    </>
  );
}

function SplashScreenController(): null {
  const { isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return null;
}

function NotificationResponseController(): null {
  const { syncAfterNotificationTap } = useNotifications();
  const handledResponseKeysRef = useRef<Set<string>>(new Set());

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
      void syncAfterNotificationTap();
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
