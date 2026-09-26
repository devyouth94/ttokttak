import { Redirect } from "expo-router";

import { LoginScreen } from "~/screens/login/ui/login-screen";
import { useSession } from "~/session/provider";

export default function IndexRoute(): React.JSX.Element | null {
  const { status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (status === "ready") {
    return <Redirect href="/(tabs)/home" />;
  }

  return <LoginScreen />;
}
