import type { CompletionLog } from "~/features/recurring/domain/types";
import {
  getRepositoryClient,
  type RepositoryClient,
} from "~/features/recurring/repositories/repository-client";
import type {
  CompletionLogInsert,
  CompletionLogRow,
} from "~/lib/database.types";

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

export type ListCompletionLogsForItemHistoryOptions =
  ListCompletionLogsForItemOptions;

export type GetCompletionLogAnchorBeforeRangeOptions =
  ListCompletionLogsForItemOptions & {
    rangeStartUtc: string;
  };

export type ListCompletionLogsOptions = {
  client?: RepositoryClient;
  itemIds?: string[];
  userId: string;
};

export type ListCompletionLogsInRangeOptions = {
  client?: RepositoryClient;
  itemIds?: string[];
  rangeEndUtc: string;
  rangeStartUtc: string;
  userId: string;
};

function normalizeUtcString(value: string): string {
  return new Date(value).toISOString();
}

function applyItemIdsFilter<
  TQuery extends {
    in(column: string, values: string[]): TQuery;
  },
>(query: TQuery, itemIds?: string[]): TQuery {
  if (!itemIds?.length) {
    return query;
  }

  return query.in("item_id", itemIds);
}

/**
 * DB row를 도메인에서 사용하는 completion log 형태로 변환한다.
 */
function toCompletionLog(row: CompletionLogRow): CompletionLog {
  return {
    id: row.id,
    userId: row.user_id,
    itemId: row.item_id,
    scheduledAtUtc: normalizeUtcString(row.scheduled_at_utc),
    action: row.action as CompletionLog["action"],
    actedAtUtc: normalizeUtcString(row.acted_at_utc),
    deviceId: row.device_id,
    createdAt: normalizeUtcString(row.created_at),
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
    scheduled_at_utc: normalizeUtcString(input.scheduledAtUtc),
    action: input.action,
    acted_at_utc: input.actedAtUtc
      ? normalizeUtcString(input.actedAtUtc)
      : undefined,
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
  const supabase = getRepositoryClient(client);
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
 * 상세 화면의 최근 히스토리용 completion log만 조회한다.
 */
export async function listCompletionLogsForItemHistory({
  client,
  itemId,
  userId,
}: ListCompletionLogsForItemHistoryOptions): Promise<CompletionLog[]> {
  const supabase = getRepositoryClient(client);
  const { data, error } = await supabase
    .from("completion_logs")
    .select("*")
    .eq("item_id", itemId)
    .eq("user_id", userId)
    .order("scheduled_at_utc", { ascending: false })
    .limit(5);

  if (error) {
    throw error;
  }

  return data.map(toCompletionLog);
}

/**
 * completion_based 계산에서 표시 범위 이전 anchor로 쓸 최신 완료 기록을 조회한다.
 */
export async function getCompletionLogAnchorBeforeRange({
  client,
  itemId,
  rangeStartUtc,
  userId,
}: GetCompletionLogAnchorBeforeRangeOptions): Promise<CompletionLog | null> {
  const supabase = getRepositoryClient(client);
  const { data, error } = await supabase
    .from("completion_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .eq("action", "completed")
    .lt("acted_at_utc", rangeStartUtc)
    .order("acted_at_utc", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data[0] ? toCompletionLog(data[0]) : null;
}

/**
 * 현재 사용자의 completion log 전체 목록을 조회한다.
 * itemIds가 있으면 해당 항목들만 포함한다.
 */
export async function listCompletionLogs({
  client,
  itemIds,
  userId,
}: ListCompletionLogsOptions): Promise<CompletionLog[]> {
  const supabase = getRepositoryClient(client);
  const query = applyItemIdsFilter(
    supabase
      .from("completion_logs")
      .select("*")
      .eq("user_id", userId)
      .order("scheduled_at_utc", { ascending: true }),
    itemIds
  );

  const { data, error } = await query;

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
  const supabase = getRepositoryClient(client);
  const query = applyItemIdsFilter(
    supabase
      .from("completion_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("scheduled_at_utc", rangeStartUtc)
      .lte("scheduled_at_utc", rangeEndUtc)
      .order("scheduled_at_utc", { ascending: true }),
    itemIds
  );

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
  const supabase = getRepositoryClient(client);
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
