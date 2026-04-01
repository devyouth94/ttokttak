import type { SupabaseClient } from "@supabase/supabase-js";

import type { CompletionLog } from "~/features/recurring/domain/types";
import type {
  CompletionLogInsert,
  CompletionLogRow,
  Database,
} from "~/lib/database.types";
import { getSupabaseClient } from "~/lib/supabase";

type RepositoryClient = SupabaseClient<Database>;

export type CreateCompletionLogInput = {
  actedAtUtc?: string;
  action: CompletionLog["action"];
  deviceId?: string | null;
  itemId: string;
  scheduledAtUtc: string;
  userId: string;
};

export type ListCompletionLogsForItemOptions = {
  client?: RepositoryClient;
  itemId: string;
  userId: string;
};

export type ListCompletionLogsInRangeOptions = {
  client?: RepositoryClient;
  itemIds?: string[];
  rangeEndUtc: string;
  rangeStartUtc: string;
  userId: string;
};

function getClient(client?: RepositoryClient): RepositoryClient {
  return client ?? getSupabaseClient();
}

/**
 * DB row를 도메인에서 사용하는 completion log 형태로 변환한다.
 */
function toCompletionLog(row: CompletionLogRow): CompletionLog {
  return {
    id: row.id,
    userId: row.user_id,
    itemId: row.item_id,
    scheduledAtUtc: row.scheduled_at_utc,
    action: row.action as CompletionLog["action"],
    actedAtUtc: row.acted_at_utc,
    deviceId: row.device_id,
    createdAt: row.created_at,
  };
}

/**
 * completion log 생성 입력을 DB insert payload로 변환한다.
 */
function toCompletionLogInsert(
  input: CreateCompletionLogInput
): CompletionLogInsert {
  return {
    user_id: input.userId,
    item_id: input.itemId,
    scheduled_at_utc: input.scheduledAtUtc,
    action: input.action,
    acted_at_utc: input.actedAtUtc,
    device_id: input.deviceId,
  };
}

/**
 * 특정 반복 항목에 연결된 completion log를 시간순으로 조회한다.
 */
export async function listCompletionLogsForItem({
  client,
  itemId,
  userId,
}: ListCompletionLogsForItemOptions): Promise<CompletionLog[]> {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from("completion_logs")
    .select("*")
    .eq("item_id", itemId)
    .eq("user_id", userId)
    .order("scheduled_at_utc", { ascending: true });

  if (error) {
    throw error;
  }

  return data.map(toCompletionLog);
}

/**
 * 지정한 UTC 범위 안의 completion log를 조회한다.
 * itemIds가 있으면 해당 항목들로 범위를 한 번 더 좁힌다.
 */
export async function listCompletionLogsInRange({
  client,
  itemIds,
  rangeEndUtc,
  rangeStartUtc,
  userId,
}: ListCompletionLogsInRangeOptions): Promise<CompletionLog[]> {
  const supabase = getClient(client);
  let query = supabase
    .from("completion_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("scheduled_at_utc", rangeStartUtc)
    .lte("scheduled_at_utc", rangeEndUtc)
    .order("scheduled_at_utc", { ascending: true });

  if (itemIds && itemIds.length > 0) {
    query = query.in("item_id", itemIds);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data.map(toCompletionLog);
}

/**
 * 특정 occurrence identity에 대한 completion 또는 skipped 로그를 생성한다.
 */
export async function createCompletionLog(
  input: CreateCompletionLogInput,
  client?: RepositoryClient
): Promise<CompletionLog> {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from("completion_logs")
    .insert(toCompletionLogInsert(input))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toCompletionLog(data);
}
