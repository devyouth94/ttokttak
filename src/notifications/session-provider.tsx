import type { PropsWithChildren } from "react";

import { useSession } from "~/session/provider";

import { NotificationProvider } from "./provider";

export function SessionNotificationProvider({
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
