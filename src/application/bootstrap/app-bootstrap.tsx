import { useEffect, useRef } from "react";
import { router, SplashScreen } from "expo-router";

import { useSession } from "~/application/session";
import {
  getNotificationNavigationKey,
  shouldNavigateHomeFromNotificationResponse,
  useNotifications,
} from "~/features/notifications";
import {
  addLocalNotificationResponseReceivedListener,
  clearLastLocalNotificationResponse,
  configureDefaultLocalNotificationHandler,
  getLastLocalNotificationResponse,
  type LocalNotificationResponse,
} from "~/shared/lib/notifications";

void SplashScreen.preventAutoHideAsync();

configureDefaultLocalNotificationHandler();

type HandleNotificationResponseInput = {
  handledResponseKeys: Set<string>;
  navigateToHome: () => void;
  response: LocalNotificationResponse | null;
  syncAfterNotificationTap: () => void;
};

export function handleLocalNotificationResponse({
  handledResponseKeys,
  navigateToHome,
  response,
  syncAfterNotificationTap,
}: HandleNotificationResponseInput): boolean {
  if (!response) {
    return false;
  }

  const responseKey = getNotificationNavigationKey(response);

  if (handledResponseKeys.has(responseKey)) {
    return false;
  }

  if (!shouldNavigateHomeFromNotificationResponse(response)) {
    return false;
  }

  navigateToHome();
  handledResponseKeys.add(responseKey);
  syncAfterNotificationTap();

  return true;
}

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
      response: LocalNotificationResponse | null
    ): void => {
      handleLocalNotificationResponse({
        handledResponseKeys: handledResponseKeysRef.current,
        navigateToHome: () => {
          router.replace("/home");
        },
        response,
        syncAfterNotificationTap: () => {
          void syncAfterNotificationTap();
        },
      });
    };

    void getLastLocalNotificationResponse().then((response) => {
      handleResponse(response);
      void clearLastLocalNotificationResponse();
    });

    const subscription = addLocalNotificationResponseReceivedListener(
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
