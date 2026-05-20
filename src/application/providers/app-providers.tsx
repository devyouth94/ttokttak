import { type PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";

import { NotificationProvider } from "~/features/notifications/notification-provider";
import { SessionProvider } from "~/features/session/session-provider";
import { queryClient } from "~/shared/lib/query/query-client";

export function AppProviders({
  children,
}: PropsWithChildren): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <NotificationProvider>
            <StatusBar style="dark" />
            {children}
            <PortalHost />
          </NotificationProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
