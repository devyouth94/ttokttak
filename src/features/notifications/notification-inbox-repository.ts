import type { NotificationKind } from "~/features/recurring/domain/types";
import {
  getRepositoryClient,
  type RepositoryClient,
} from "~/features/recurring/repositories/repository-client";
import type {
  NotificationInboxItemRow,
  NotificationInboxItemUpdate,
} from "~/lib/database.types";

type NotificationInboxItemWithRecurringItemRow = NotificationInboxItemRow & {
  recurring_items?: {
    is_archived: boolean;
  } | null;
};

export interface NotificationInboxItem {
  id: string;
  userId: string;
  itemId: string;
  sourceJobId?: string | null;
  notificationKind: NotificationKind;
  itemScheduledAtUtc: string;
  deliveredAtUtc: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  readAt?: string | null;
  hiddenAt?: string | null;
  isItemArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ListNotificationInboxItemsOptions = {
  client?: RepositoryClient;
  limit?: number;
  userId: string;
};

export type MarkNotificationInboxItemReadOptions = {
  client?: RepositoryClient;
  id: string;
  readAt?: string;
  userId: string;
};

export type MarkAllNotificationInboxItemsReadOptions = {
  client?: RepositoryClient;
  readAt?: string;
  userId: string;
};

export type MarkNotificationInboxItemsReadOptions = {
  client?: RepositoryClient;
  ids: string[];
  readAt?: string;
  userId: string;
};

export type HideNotificationInboxItemOptions = {
  client?: RepositoryClient;
  hiddenAt?: string;
  id: string;
  userId: string;
};

export type HideNotificationInboxItemsOptions = {
  client?: RepositoryClient;
  hiddenAt?: string;
  ids: string[];
  userId: string;
};

function toNotificationInboxItem(
  row: NotificationInboxItemWithRecurringItemRow
): NotificationInboxItem {
  return {
    body: row.body,
    createdAt: row.created_at,
    deliveredAtUtc: row.delivered_at_utc,
    hiddenAt: row.hidden_at,
    id: row.id,
    isItemArchived: row.recurring_items?.is_archived ?? false,
    itemId: row.item_id,
    itemScheduledAtUtc: row.item_scheduled_at_utc,
    notificationKind: row.notification_kind as NotificationKind,
    payload: row.payload,
    readAt: row.read_at,
    sourceJobId: row.source_job_id,
    title: row.title,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export async function listNotificationInboxItems({
  client,
  limit,
  userId,
}: ListNotificationInboxItemsOptions): Promise<NotificationInboxItem[]> {
  const supabase = getRepositoryClient(client);
  let query = supabase
    .from("notification_inbox_items")
    .select("*, recurring_items(is_archived)")
    .eq("user_id", userId)
    .is("hidden_at", null)
    .order("delivered_at_utc", { ascending: false });

  if (limit !== undefined) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data.map(toNotificationInboxItem);
}

export async function markNotificationInboxItemRead({
  client,
  id,
  readAt = new Date().toISOString(),
  userId,
}: MarkNotificationInboxItemReadOptions): Promise<void> {
  const supabase = getRepositoryClient(client);
  const update: NotificationInboxItemUpdate = {
    read_at: readAt,
  };
  const { error } = await supabase
    .from("notification_inbox_items")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .is("hidden_at", null);

  if (error) {
    throw error;
  }
}

export async function markAllNotificationInboxItemsRead({
  client,
  readAt = new Date().toISOString(),
  userId,
}: MarkAllNotificationInboxItemsReadOptions): Promise<void> {
  const supabase = getRepositoryClient(client);
  const update: NotificationInboxItemUpdate = {
    read_at: readAt,
  };
  const { error } = await supabase
    .from("notification_inbox_items")
    .update(update)
    .eq("user_id", userId)
    .is("hidden_at", null)
    .is("read_at", null);

  if (error) {
    throw error;
  }
}

export async function markNotificationInboxItemsRead({
  client,
  ids,
  readAt = new Date().toISOString(),
  userId,
}: MarkNotificationInboxItemsReadOptions): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const supabase = getRepositoryClient(client);
  const update: NotificationInboxItemUpdate = {
    read_at: readAt,
  };
  const { error } = await supabase
    .from("notification_inbox_items")
    .update(update)
    .eq("user_id", userId)
    .in("id", ids)
    .is("hidden_at", null);

  if (error) {
    throw error;
  }
}

export async function hideNotificationInboxItem({
  client,
  hiddenAt = new Date().toISOString(),
  id,
  userId,
}: HideNotificationInboxItemOptions): Promise<void> {
  const supabase = getRepositoryClient(client);
  const update: NotificationInboxItemUpdate = {
    hidden_at: hiddenAt,
  };
  const { error } = await supabase
    .from("notification_inbox_items")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .is("hidden_at", null);

  if (error) {
    throw error;
  }
}

export async function hideNotificationInboxItems({
  client,
  hiddenAt = new Date().toISOString(),
  ids,
  userId,
}: HideNotificationInboxItemsOptions): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const supabase = getRepositoryClient(client);
  const update: NotificationInboxItemUpdate = {
    hidden_at: hiddenAt,
  };
  const { error } = await supabase
    .from("notification_inbox_items")
    .update(update)
    .eq("user_id", userId)
    .in("id", ids)
    .is("hidden_at", null);

  if (error) {
    throw error;
  }
}
