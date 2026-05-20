import { useQuery } from "@tanstack/react-query";

import {
  getRecurringItemById,
  listRecurringItems,
} from "~/entities/schedule/api";

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

export function useRecurringItemByIdQuery({
  enabled,
  itemId,
  timezone,
  userId,
}: {
  enabled: boolean;
  itemId: string | null;
  timezone: string;
  userId: string | null;
}) {
  return useQuery({
    enabled: enabled && Boolean(userId) && Boolean(itemId),
    queryFn: async () =>
      getRecurringItemById({
        id: itemId!,
        timezone,
        userId: userId!,
      }),
    queryKey: recurringQueryKeys.item(
      userId ?? "anonymous",
      timezone,
      itemId ?? "unknown"
    ),
  });
}
