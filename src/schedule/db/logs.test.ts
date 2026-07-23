import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "~/database.types";

import {
  createLogs,
  getAnchor,
  listHistory,
  listItemLogs,
  listLogs,
  listLogsInRange,
} from "./logs";

jest.mock("~/supabase", () => ({ supabase: {} }));

declare const process: { cwd: () => string };
declare const require: (moduleName: string) => unknown;

const { readFileSync } = require("fs") as {
  readFileSync: (path: string, encoding: "utf8") => string;
};

type Query<Result> = Record<string, jest.Mock> & {
  then: PromiseLike<Result>["then"];
};

function createQuery<Result>(result: Result, methods: string[]): Query<Result> {
  const query = {} as Query<Result>;

  for (const method of methods) {
    query[method] = jest.fn(() => query);
  }

  query.then = ((resolve) =>
    Promise.resolve(
      resolve ? resolve(result) : result
    )) as Query<Result>["then"];

  return query;
}

const row = {
  acted_at_utc: "2026-04-03 01:00:00+00",
  action: "completed",
  created_at: "2026-04-03 01:00:00+00",
  id: "log-1",
  item_id: "item-1",
  scheduled_at_utc: "2026-04-03 00:00:00+00",
  user_id: "user-1",
};

function createClient(query: unknown) {
  return {
    from: jest.fn(() => ({ select: jest.fn(() => query) })),
  } as never;
}

describe("schedule logs DB", () => {
  it("사용자와 일정으로 기록을 조회하고 UTC를 정규화한다", async () => {
    const query = createQuery({ data: [row], error: null }, [
      "eq",
      "in",
      "order",
    ]);

    const logs = await listLogs(
      { itemIds: ["item-1"], userId: "user-1" },
      createClient(query)
    );

    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.in).toHaveBeenCalledWith("item_id", ["item-1"]);
    expect(logs[0]).toMatchObject({
      actedAtUtc: "2026-04-03T01:00:00.000Z",
      scheduledAtUtc: "2026-04-03T00:00:00.000Z",
    });
  });

  it("한 일정의 기록이 1000건을 넘으면 다음 페이지도 조회한다", async () => {
    const rows = Array.from({ length: 1001 }, (_, index) => ({
      ...row,
      id: `log-${index}`,
    }));
    const first = createQuery({ data: rows.slice(0, 1000), error: null }, [
      "eq",
      "order",
      "range",
    ]);
    const second = createQuery({ data: rows.slice(1000), error: null }, [
      "eq",
      "order",
      "range",
    ]);
    const select = jest
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    const client = { from: jest.fn(() => ({ select })) } as never;

    await expect(
      listItemLogs({ itemId: "item-1", userId: "user-1" }, client)
    ).resolves.toHaveLength(1001);
    expect(first.range).toHaveBeenCalledWith(0, 999);
    expect(second.range).toHaveBeenCalledWith(1000, 1999);
  });

  it("상세 히스토리는 최신 예정 시각 5건만 조회한다", async () => {
    const query = createQuery({ data: [row], error: null }, [
      "eq",
      "limit",
      "order",
    ]);

    await listHistory(
      { itemId: "item-1", userId: "user-1" },
      createClient(query)
    );

    expect(query.order).toHaveBeenCalledWith("scheduled_at_utc", {
      ascending: false,
    });
    expect(query.limit).toHaveBeenCalledWith(5);
  });

  it("범위 이전의 최신 완료 기록을 anchor로 조회한다", async () => {
    const query = createQuery({ data: [row], error: null }, [
      "eq",
      "limit",
      "lt",
      "order",
    ]);

    await getAnchor(
      {
        itemId: "item-1",
        rangeStartUtc: "2026-04-03T00:00:00.000Z",
        userId: "user-1",
      },
      createClient(query)
    );

    expect(query.eq).toHaveBeenCalledWith("action", "completed");
    expect(query.lt).toHaveBeenCalledWith(
      "acted_at_utc",
      "2026-04-03T00:00:00.000Z"
    );
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it("지정한 UTC 범위의 기록을 조회한다", async () => {
    const query = createQuery({ data: [row], error: null }, [
      "eq",
      "gte",
      "in",
      "lte",
      "order",
    ]);

    await listLogsInRange(
      {
        itemIds: ["item-1"],
        rangeEndUtc: "2026-04-04T00:00:00.000Z",
        rangeStartUtc: "2026-04-02T00:00:00.000Z",
        userId: "user-1",
      },
      createClient(query)
    );

    expect(query.gte).toHaveBeenCalledWith(
      "scheduled_at_utc",
      "2026-04-02T00:00:00.000Z"
    );
    expect(query.lte).toHaveBeenCalledWith(
      "scheduled_at_utc",
      "2026-04-04T00:00:00.000Z"
    );
  });

  it("여러 occurrence 처리 기록을 한 요청으로 생성한다", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const client = { from: jest.fn(() => ({ upsert })) } as never;

    await createLogs(
      [
        {
          action: "completed",
          itemId: "item-1",
          scheduledAtUtc: "2026-04-03T00:00:00.000Z",
          userId: "user-1",
        },
        {
          action: "skipped",
          itemId: "item-1",
          scheduledAtUtc: "2026-04-04T00:00:00.000Z",
          userId: "user-1",
        },
      ],
      client
    );

    expect(upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          action: "completed",
          item_id: "item-1",
          user_id: "user-1",
        }),
        expect.objectContaining({
          action: "skipped",
          item_id: "item-1",
          user_id: "user-1",
        }),
      ],
      {
        ignoreDuplicates: true,
        onConflict: "item_id,scheduled_at_utc",
      }
    );
  });

  it("여러 처리 기록은 중복을 무시하고 DB 처리 시각을 사용한다", async () => {
    let columns: string | null = null;
    let onConflict: string | null = null;
    let prefer: string | null = null;
    const fetch = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));

        columns = url.searchParams.get("columns");
        onConflict = url.searchParams.get("on_conflict");
        prefer = new Headers(init?.headers).get("Prefer");
        return new Response(null, { status: 201 });
      }
    );
    const client = createSupabaseClient<Database>(
      "https://example.supabase.co",
      "test-key",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
        global: { fetch },
      }
    );

    await createLogs(
      [
        {
          action: "completed",
          itemId: "item-1",
          scheduledAtUtc: "2026-04-03T00:00:00.000Z",
          userId: "user-1",
        },
      ],
      client
    );

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(columns).not.toContain('"acted_at_utc"');
    expect(onConflict).toBe("item_id,scheduled_at_utc");
    expect(prefer).toContain("resolution=ignore-duplicates");
  });

  it("현재 조회 경계에 필요한 복합 index를 유지한다", () => {
    const schema = readFileSync(
      `${process.cwd()}/docs/database/DATABASE.sql`,
      "utf8"
    );

    for (const index of [
      "idx_recurring_items_user_archived_created_at",
      "idx_completion_logs_user_item_scheduled_at",
      "idx_completion_logs_user_item_action_acted_at",
    ]) {
      expect(schema).toContain(index);
    }
  });
});
