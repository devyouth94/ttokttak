import { type PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";

import { NotificationBootstrapProvider } from "~/features/notifications/notification-bootstrap";
import { SessionProvider } from "~/features/session/session-provider";
import { queryClient } from "~/lib/query/query-client";

export function AppProviders({
  children,
}: PropsWithChildren): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <NotificationBootstrapProvider>
            <StatusBar style="dark" />
            {children}
            <PortalHost />
          </NotificationBootstrapProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
