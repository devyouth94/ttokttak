import { Redirect } from "expo-router";

import { LoginScreen as SessionLoginScreen } from "~/features/session/components/login-screen";
import { useSession } from "~/features/session/session-provider";

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
    <SessionLoginScreen
      isConfigured={isConfigured}
      onApplePress={signInWithApple}
      onGooglePress={signInWithGoogle}
    />
  );
}
