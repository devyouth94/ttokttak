import type { QueryClient } from "@tanstack/react-query";

import { scheduleReadQueryKeys } from "./schedule-read-query-keys";

export async function invalidateScheduleReadQueries(
  queryClient: QueryClient,
  userId: string
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: scheduleReadQueryKeys.user(userId),
  });
}
