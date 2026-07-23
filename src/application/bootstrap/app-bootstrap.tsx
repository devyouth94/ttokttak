import { useEffect } from "react";
import { SplashScreen } from "expo-router";

import { useSession } from "~/session/provider";

void SplashScreen.preventAutoHideAsync();

export function AppBootstrap(): React.JSX.Element {
  return <SplashScreenController />;
}

function SplashScreenController(): null {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "loading") {
      void SplashScreen.hideAsync();
    }
  }, [status]);

  return null;
}
