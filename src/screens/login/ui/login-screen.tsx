import { Redirect } from "expo-router";

import { useSession } from "~/application/session";

import { LoginScreenContent } from "./login-screen-content";

export function LoginScreen(): React.JSX.Element {
  const {
    isAuthenticated,
    isConfigured,
    isLoading,
    signInWithApple,
    signInWithGoogle,
  } = useSession();

  if (isLoading) {
    return <></>;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <LoginScreenContent
      isConfigured={isConfigured}
      onApplePress={signInWithApple}
      onGooglePress={signInWithGoogle}
    />
  );
}
