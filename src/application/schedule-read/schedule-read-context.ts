import { useSession } from "~/application/session";
import type { ScheduleReadContext } from "~/features/read-schedule";

export function useScheduleReadContext(): ScheduleReadContext {
  const { isAuthenticated, profile, user } = useSession();

  return {
    isReady: isAuthenticated && Boolean(user?.id),
    timezone:
      profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    userId: user?.id ?? null,
  };
}
