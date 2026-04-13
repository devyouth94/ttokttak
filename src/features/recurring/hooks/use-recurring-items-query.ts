import { useQuery } from "@tanstack/react-query";

import { listRecurringItems } from "~/features/recurring/repositories/recurring-items-repository";

import { recurringQueryKeys } from "./recurring-query-keys";

export function useRecurringItemsQuery({
  enabled,
  timezone,
  userId,
}: {
  enabled: boolean;
  timezone: string;
  userId: string | null;
}) {
  return useQuery({
    enabled: enabled && Boolean(userId),
    queryFn: async () =>
      listRecurringItems({
        timezone,
        userId: userId!,
      }),
    queryKey: recurringQueryKeys.items(userId ?? "anonymous", timezone),
  });
}
