import { type PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";

import { SessionProvider, useSession } from "~/application/session";
import { NotificationProvider } from "~/features/notifications/notification-provider";
import { queryClient } from "~/shared/lib/query/query-client";

export function AppProviders({
  children,
}: PropsWithChildren): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <SessionNotificationProvider>
            <StatusBar style="dark" />
            {children}
            <PortalHost />
          </SessionNotificationProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function SessionNotificationProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const { profile, user } = useSession();
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <NotificationProvider timezone={timezone} userId={user?.id}>
      {children}
    </NotificationProvider>
  );
}
