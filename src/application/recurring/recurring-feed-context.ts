import { useSession } from "~/application/session";
import type { RecurringFeedContext } from "~/features/recurring/hooks/recurring-feed-context";

export function useRecurringFeedContext(): RecurringFeedContext {
  const { isAuthenticated, profile, user } = useSession();

  return {
    isReady: isAuthenticated && Boolean(user?.id),
    timezone:
      profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    userId: user?.id ?? null,
  };
}
