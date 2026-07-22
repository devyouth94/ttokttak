import { Redirect } from "expo-router";

import { useSession } from "~/session/provider";

import { LoginScreenContent } from "./login-screen-content";

export function LoginScreen(): React.JSX.Element {
  const { signInApple, signInGoogle, status } = useSession();

  if (status === "loading") {
    return <></>;
  }

  if (status === "ready") {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <LoginScreenContent
      onApplePress={signInApple}
      onGooglePress={signInGoogle}
    />
  );
}
