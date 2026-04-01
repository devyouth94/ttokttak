import { useEffect } from "react";
import { Slot, SplashScreen } from "expo-router";

import {
  SessionProvider,
  useSession,
} from "~/features/session/session-provider";

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

export default function RootLayout() {
  return (
    <SessionProvider>
      <SplashScreenController />
      <Slot />
    </SessionProvider>
  );
}
