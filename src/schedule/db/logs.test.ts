import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "~/database.types";

import { listLogs } from "./logs";

jest.mock("~/supabase", () => ({ supabase: {} }));

const row = {
  acted_at_utc: "2026-04-03 01:00:00+00",
  action: "completed",
  created_at: "2026-04-03 01:00:00+00",
  id: "log-1",
  item_id: "item-1",
  scheduled_at_utc: "2026-04-03 00:00:00+00",
  user_id: "user-1",
};

it("짧은 페이지 응답에도 count 전체를 ID 순서로 읽는다", async () => {
  const rows = Array.from({ length: 5 }, (_, index) => ({
    ...row,
    id: `log-${index + 1}`,
  }));
  const offsets: number[] = [];
  const fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const offset = Number(url.searchParams.get("offset"));
    offsets.push(offset);

    expect(url.searchParams.get("user_id")).toBe("eq.user-1");
    expect(url.searchParams.get("item_id")).toBe("in.(item-1,item-2)");
    expect(url.searchParams.get("order")).toBe("scheduled_at_utc.asc,id.asc");
    const page = rows.slice(offset, offset + 2);

    return new Response(JSON.stringify(page), {
      headers: {
        "content-range": `${offset}-${offset + page.length - 1}/5`,
      },
    });
  });

  const logs = await listLogs(
    { itemIds: ["item-1", "item-2"], userId: "user-1" },
    httpClient(fetch)
  );

  expect(logs.map(({ id }) => id)).toEqual([
    "log-1",
    "log-2",
    "log-3",
    "log-4",
    "log-5",
  ]);
  expect(offsets).toEqual([0, 2, 4]);
});

it.each(["error", "missing-count", "empty"] as const)(
  "%s 응답을 부분 결과로 반환하지 않는다",
  async (failure) => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(
        failure === "missing-count"
          ? new Response(JSON.stringify([row]))
          : new Response(JSON.stringify([row]), {
              headers: { "content-range": "0-0/2" },
            })
      )
      .mockResolvedValueOnce(
        failure === "error"
          ? new Response(JSON.stringify({ message: "조회 실패" }), {
              status: 500,
            })
          : new Response("[]", {
              headers: failure === "empty" ? { "content-range": "*/2" } : {},
            })
      );

    await expect(
      listLogs({ userId: "user-1" }, httpClient(fetch))
    ).rejects.toBeDefined();
  }
);

it("빈 itemIds는 조회하지 않고 생략하면 사용자 전체를 조회한다", async () => {
  const fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));

    expect(url.searchParams.get("user_id")).toBe("eq.user-1");
    expect(url.searchParams.has("item_id")).toBe(false);
    return new Response("[]", { headers: { "content-range": "*/0" } });
  });
  const client = httpClient(fetch);

  await expect(
    listLogs({ itemIds: [], userId: "user-1" }, client)
  ).resolves.toEqual([]);
  expect(fetch).not.toHaveBeenCalled();
  await expect(listLogs({ userId: "user-1" }, client)).resolves.toEqual([]);
  expect(fetch).toHaveBeenCalledTimes(1);
});

function httpClient(fetch: typeof globalThis.fetch) {
  return createSupabaseClient<Database>(
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
}
