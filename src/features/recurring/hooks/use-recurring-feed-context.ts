import { useSession } from "~/features/session/session-provider";

export type RecurringFeedContext = {
  isReady: boolean;
  timezone: string;
  userId: string | null;
};

export function useRecurringFeedContext(): RecurringFeedContext {
  const { isAuthenticated, profile, user } = useSession();

  return {
    isReady: isAuthenticated && Boolean(user?.id),
    timezone:
      profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    userId: user?.id ?? null,
  };
}
