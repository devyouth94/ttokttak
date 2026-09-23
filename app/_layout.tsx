import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SplashScreen, Stack } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";

import { DeviceSyncProvider } from "~/device-sync";
import { AppI18nProvider } from "~/i18n/provider";
import { queryClient } from "~/query-client";
import { wrap } from "~/sentry";
import { SessionProvider, useSession } from "~/session/provider";
import { ThemeProvider, useThemeColors } from "~/theme/provider";
import { ThemeStatusBar } from "~/theme/status-bar";
import { StateMessage } from "~/ui/state-message";

void SplashScreen.preventAutoHideAsync();

function RootLayout(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppI18nProvider>
          <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <RootStack />
            </SessionProvider>
          </QueryClientProvider>
        </AppI18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootStack(): React.JSX.Element {
  const { t } = useTranslation();

  const { profile, retry, status, user } = useSession();
  const themeColors = useThemeColors();
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (status !== "loading") {
      void SplashScreen.hideAsync();
    }
  }, [status]);

  return (
    <DeviceSyncProvider timezone={timezone} userId={user?.id}>
      <ThemeStatusBar />

      {status === "error" && (
        <StateMessage
          action={{
            accessibilityHint: t("session.error.retryHint"),
            label: t("session.error.retryLabel"),
            onPress: () => {
              void retry();
            },
          }}
          description={t("session.error.description")}
          style={{ backgroundColor: themeColors.background }}
          title={t("session.error.title")}
        />
      )}

      {status !== "error" && (
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: themeColors.background },
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        </Stack>
      )}

      <PortalHost />
    </DeviceSyncProvider>
  );
}

export default wrap(RootLayout);
