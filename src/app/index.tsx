import { Redirect } from "expo-router";

import { LoginScreen } from "~/features/session/components/login-screen";
import { useSession } from "~/features/session/session-provider";

export default function IndexScreen(): React.JSX.Element {
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
    <LoginScreen
      isConfigured={isConfigured}
      onApplePress={signInWithApple}
      onGooglePress={signInWithGoogle}
    />
  );
}
