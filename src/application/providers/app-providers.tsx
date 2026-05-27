import { type PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";

import { LocalNotificationProvider } from "~/application/notifications";
import { SessionProvider, useSession } from "~/application/session";
import { AppI18nProvider } from "~/shared/i18n";
import { queryClient } from "~/shared/lib/query/query-client";
import { useAppTheme } from "~/shared/theme";
import { AppThemeProvider } from "~/shared/theme/theme-provider";

export function AppProviders({
  children,
}: PropsWithChildren): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AppI18nProvider>
          <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <SessionNotificationProvider>
                <ThemeStatusBar />
                {children}
                <PortalHost />
              </SessionNotificationProvider>
            </SessionProvider>
          </QueryClientProvider>
        </AppI18nProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemeStatusBar(): React.JSX.Element {
  const { resolvedTheme } = useAppTheme();

  return <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />;
}

function SessionNotificationProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const { profile, user } = useSession();
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <LocalNotificationProvider timezone={timezone} userId={user?.id}>
      {children}
    </LocalNotificationProvider>
  );
}
