import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  hideNotificationInboxItem,
  hideNotificationInboxItems,
  listNotificationInboxItems,
  markAllNotificationInboxItemsRead,
  markNotificationInboxItemRead,
  markNotificationInboxItemsRead,
  type NotificationInboxItem,
} from "~/features/notifications/notification-inbox-repository";
import { notificationQueryKeys } from "~/features/notifications/notification-query-keys";
import { useSession } from "~/features/session/session-provider";

export function useNotificationInboxItemsQuery({
  enabled = true,
  limit,
}: {
  enabled?: boolean;
  limit?: number;
} = {}) {
  const { user } = useSession();
  const userId = user?.id ?? null;

  return useQuery({
    enabled: enabled && Boolean(userId),
    queryFn: async () =>
      listNotificationInboxItems({
        limit,
        userId: userId!,
      }),
    queryKey: notificationQueryKeys.inboxItems(userId ?? "anonymous", limit),
  });
}

export function useMarkNotificationInboxItemReadMutation() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: async ({ id, readAt }: { id: string; readAt: string }) => {
      if (!userId) {
        return;
      }

      await markNotificationInboxItemRead({
        id,
        readAt,
        userId,
      });
    },
    onMutate: async ({ id, readAt }) => {
      if (!userId) {
        return;
      }

      const queryKey = notificationQueryKeys.inboxItemsPrefix(userId);

      await queryClient.cancelQueries({
        queryKey,
      });

      queryClient.setQueriesData<NotificationInboxItem[]>(
        {
          queryKey,
        },
        (items) =>
          items?.map((item) =>
            item.id === id
              ? {
                  ...item,
                  readAt,
                }
              : item
          )
      );
    },
    onSettled: async () => {
      if (!userId) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.inboxItemsPrefix(userId),
      });
    },
  });
}

export function useMarkAllNotificationInboxItemsReadMutation() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: async ({ readAt }: { readAt: string }) => {
      if (!userId) {
        return;
      }

      await markAllNotificationInboxItemsRead({
        readAt,
        userId,
      });
    },
    onMutate: async ({ readAt }) => {
      if (!userId) {
        return;
      }

      const queryKey = notificationQueryKeys.inboxItemsPrefix(userId);

      await queryClient.cancelQueries({
        queryKey,
      });

      queryClient.setQueriesData<NotificationInboxItem[]>(
        {
          queryKey,
        },
        (items) =>
          items?.map((item) => ({
            ...item,
            readAt: item.readAt ?? readAt,
          }))
      );
    },
    onSettled: async () => {
      if (!userId) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.inboxItemsPrefix(userId),
      });
    },
  });
}

export function useHideNotificationInboxItemMutation() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: async ({ hiddenAt, id }: { hiddenAt: string; id: string }) => {
      if (!userId) {
        return;
      }

      await hideNotificationInboxItem({
        hiddenAt,
        id,
        userId,
      });
    },
    onMutate: async ({ id }) => {
      if (!userId) {
        return;
      }

      const queryKey = notificationQueryKeys.inboxItemsPrefix(userId);

      await queryClient.cancelQueries({
        queryKey,
      });

      queryClient.setQueriesData<NotificationInboxItem[]>(
        {
          queryKey,
        },
        (items) => items?.filter((item) => item.id !== id)
      );
    },
    onSettled: async () => {
      if (!userId) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.inboxItemsPrefix(userId),
      });
    },
  });
}

export function useMarkNotificationInboxItemsReadMutation() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: async ({ ids, readAt }: { ids: string[]; readAt: string }) => {
      if (!userId) {
        return;
      }

      await markNotificationInboxItemsRead({
        ids,
        readAt,
        userId,
      });
    },
    onMutate: async ({ ids, readAt }) => {
      if (!userId) {
        return;
      }

      const selectedIds = new Set(ids);
      const queryKey = notificationQueryKeys.inboxItemsPrefix(userId);

      await queryClient.cancelQueries({
        queryKey,
      });

      queryClient.setQueriesData<NotificationInboxItem[]>(
        {
          queryKey,
        },
        (items) =>
          items?.map((item) =>
            selectedIds.has(item.id)
              ? {
                  ...item,
                  readAt: item.readAt ?? readAt,
                }
              : item
          )
      );
    },
    onSettled: async () => {
      if (!userId) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.inboxItemsPrefix(userId),
      });
    },
  });
}

export function useHideNotificationInboxItemsMutation() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: async ({
      hiddenAt,
      ids,
    }: {
      hiddenAt: string;
      ids: string[];
    }) => {
      if (!userId) {
        return;
      }

      await hideNotificationInboxItems({
        hiddenAt,
        ids,
        userId,
      });
    },
    onMutate: async ({ ids }) => {
      if (!userId) {
        return;
      }

      const selectedIds = new Set(ids);
      const queryKey = notificationQueryKeys.inboxItemsPrefix(userId);

      await queryClient.cancelQueries({
        queryKey,
      });

      queryClient.setQueriesData<NotificationInboxItem[]>(
        {
          queryKey,
        },
        (items) => items?.filter((item) => !selectedIds.has(item.id))
      );
    },
    onSettled: async () => {
      if (!userId) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.inboxItemsPrefix(userId),
      });
    },
  });
}
