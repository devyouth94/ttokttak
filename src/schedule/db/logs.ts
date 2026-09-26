import type { Database } from "~/database.types";
import { supabase } from "~/supabase";

import type { OccurrenceLog } from "../model";

type LogRow = Database["public"]["Tables"]["completion_logs"]["Row"];
type LogInsert = Database["public"]["Tables"]["completion_logs"]["Insert"];
type Client = typeof supabase;

export type CreateLogInput = {
  action: OccurrenceLog["action"];
  itemId: string;
  scheduledAtUtc: string;
  userId: string;
};

/**
 * 처리 기록 전체를 조회한다. itemIds 생략은 사용자 전체, 빈 배열은 조회 없음이다.
 * 페이지별 전체 건수를 확인하되 여러 요청이 하나의 DB snapshot을 보장하지는 않는다.
 */
export async function listLogs(
  input: { itemIds?: string[]; userId: string },
  client: Client = supabase
): Promise<OccurrenceLog[]> {
  if (input.itemIds?.length === 0) {
    return [];
  }

  const logs: OccurrenceLog[] = [];
  const pageSize = 1000;

  while (true) {
    let query = client
      .from("completion_logs")
      .select("*", { count: "exact" })
      .eq("user_id", input.userId)
      .order("scheduled_at_utc", { ascending: true })
      .order("id", { ascending: true });
    if (input.itemIds) {
      query = query.in("item_id", input.itemIds);
    }

    const { data, error, count } = await query.range(
      logs.length,
      logs.length + pageSize - 1
    );
    if (error) {
      throw error;
    }
    if (count === null || (data.length === 0 && logs.length < count)) {
      throw new Error("처리 기록 전체를 확인하지 못했습니다.");
    }

    logs.push(...data.map(toLog));
    if (logs.length >= count) {
      return logs;
    }
  }
}

/** 한 일정의 occurrence 처리 기록 전체를 조회한다. */
export function listItemLogs(
  input: { itemId: string; userId: string },
  client: Client = supabase
): Promise<OccurrenceLog[]> {
  return listLogs({ itemIds: [input.itemId], userId: input.userId }, client);
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
