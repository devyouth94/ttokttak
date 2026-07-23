import type { Database } from "~/database.types";
import type { OccurrenceLog } from "~/schedule/rules/occurrence";
import { supabase } from "~/supabase";

type LogRow = Database["public"]["Tables"]["completion_logs"]["Row"];
type LogInsert = Database["public"]["Tables"]["completion_logs"]["Insert"];
type Client = typeof supabase;

export type CreateLogInput = {
  action: OccurrenceLog["action"];
  itemId: string;
  scheduledAtUtc: string;
  userId: string;
};

function normalizeUtc(value: string): string {
  return new Date(value).toISOString();
}

function toLog(row: LogRow): OccurrenceLog {
  return {
    actedAtUtc: normalizeUtc(row.acted_at_utc),
    action: row.action as OccurrenceLog["action"],
    id: row.id,
    itemId: row.item_id,
    scheduledAtUtc: normalizeUtc(row.scheduled_at_utc),
  };
}

function toInsert(input: CreateLogInput): LogInsert {
  return {
    action: input.action,
    item_id: input.itemId,
    scheduled_at_utc: normalizeUtc(input.scheduledAtUtc),
    user_id: input.userId,
  };
}

function filterItems<
  Query extends { in(column: string, values: string[]): Query },
>(query: Query, itemIds?: string[]): Query {
  return itemIds?.length ? query.in("item_id", itemIds) : query;
}

/** 사용자의 occurrence 처리 기록을 조회한다. */
export async function listLogs(
  input: { itemIds?: string[]; userId: string },
  client: Client = supabase
): Promise<OccurrenceLog[]> {
  const query = filterItems(
    client
      .from("completion_logs")
      .select("*")
      .eq("user_id", input.userId)
      .order("scheduled_at_utc", { ascending: true }),
    input.itemIds
  );
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data.map(toLog);
}

/** 한 일정의 occurrence 처리 기록 전체를 pagination해서 조회한다. */
export async function listItemLogs(
  input: { itemId: string; userId: string },
  client: Client = supabase
): Promise<OccurrenceLog[]> {
  const rows: LogRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from("completion_logs")
      .select("*")
      .eq("item_id", input.itemId)
      .eq("user_id", input.userId)
      .order("scheduled_at_utc", { ascending: true })
      .range(from, from + 999);

    if (error) {
      throw error;
    }

    rows.push(...data);
    from += data.length;

    if (data.length < 1000) {
      return rows.map(toLog);
    }
  }
}

/** 상세 화면에 표시할 최근 occurrence 처리 기록 5개를 조회한다. */
export async function listHistory(
  input: { itemId: string; userId: string },
  client: Client = supabase
): Promise<OccurrenceLog[]> {
  const { data, error } = await client
    .from("completion_logs")
    .select("*")
    .eq("item_id", input.itemId)
    .eq("user_id", input.userId)
    .order("scheduled_at_utc", { ascending: false })
    .limit(5);

  if (error) {
    throw error;
  }

  return data.map(toLog);
}

/** completion-based 계산에서 범위 이전의 최신 완료 기록을 조회한다. */
export async function getAnchor(
  input: { itemId: string; rangeStartUtc: string; userId: string },
  client: Client = supabase
): Promise<OccurrenceLog | null> {
  const { data, error } = await client
    .from("completion_logs")
    .select("*")
    .eq("user_id", input.userId)
    .eq("item_id", input.itemId)
    .eq("action", "completed")
    .lt("acted_at_utc", input.rangeStartUtc)
    .order("acted_at_utc", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data[0] ? toLog(data[0]) : null;
}

/** 지정한 UTC 범위의 occurrence 처리 기록을 조회한다. */
export async function listLogsInRange(
  input: {
    itemIds?: string[];
    rangeEndUtc: string;
    rangeStartUtc: string;
    userId: string;
  },
  client: Client = supabase
): Promise<OccurrenceLog[]> {
  const query = filterItems(
    client
      .from("completion_logs")
      .select("*")
      .eq("user_id", input.userId)
      .gte("scheduled_at_utc", input.rangeStartUtc)
      .lte("scheduled_at_utc", input.rangeEndUtc)
      .order("scheduled_at_utc", { ascending: true }),
    input.itemIds
  );
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data.map(toLog);
}

/** occurrence 처리 기록을 한 요청으로 생성한다. */
export async function createLogs(
  inputs: CreateLogInput[],
  client: Client = supabase
): Promise<void> {
  const { error } = await client
    .from("completion_logs")
    .upsert(inputs.map(toInsert), {
      ignoreDuplicates: true,
      onConflict: "item_id,scheduled_at_utc",
    });

  if (error) {
    throw error;
  }
}
