import { useQuery } from "@tanstack/react-query";

import {
  getRecurringItemById,
  listRecurringItems,
} from "~/entities/schedule/api";

import { scheduleReadQueryKeys } from "./schedule-read-query-keys";

export function useScheduleItemsQuery({
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
    queryKey: scheduleReadQueryKeys.items(userId ?? "anonymous", timezone),
  });
}

export function useScheduleByIdQuery({
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
    queryKey: scheduleReadQueryKeys.item(
      userId ?? "anonymous",
      timezone,
      itemId ?? "unknown"
    ),
  });
}
