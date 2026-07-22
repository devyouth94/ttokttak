import type { ScheduleReadContext } from "~/features/read-schedule";
import { useSession } from "~/session/provider";

export function useScheduleReadContext(): ScheduleReadContext {
  const { profile, status, user } = useSession();

  return {
    isReady: status === "ready",
    timezone:
      profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    userId: user?.id ?? null,
  };
}
