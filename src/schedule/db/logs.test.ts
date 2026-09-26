import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "~/database.types";

import { createLogs, listItemLogs, listLogs } from "./logs";

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

describe("schedule logs DB", () => {
  it.each([
    [0, 1000],
    [1000, 1000],
    [1001, 1000],
    [7, 2],
  ])(
    "전체 %i건을 서버 상한 %i에서도 빠짐없이 읽는다",
    async (length, serverCap) => {
      const rows = Array.from({ length }, (_, index) => ({
        ...row,
        id: `log-${String(index).padStart(4, "0")}`,
        item_id: index % 2 ? "item-2" : "item-1",
      }));
      const offsets: number[] = [];
      const fetch = jest.fn(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = new URL(String(input));
          const offset = Number(url.searchParams.get("offset"));
          const limit = Number(url.searchParams.get("limit"));
          offsets.push(offset);
          expect(url.searchParams.get("user_id")).toBe("eq.user-1");
          expect(url.searchParams.get("item_id")).toBe("in.(item-1,item-2)");
          expect(url.searchParams.get("order")).toBe(
            "scheduled_at_utc.asc,id.asc"
          );
          expect(new Headers(init?.headers).get("Prefer")).toContain(
            "count=exact"
          );
          const page = rows.slice(offset, offset + Math.min(limit, serverCap));
          return new Response(JSON.stringify(page), {
            headers: {
              "content-range": `${offset}-${offset + page.length - 1}/${length}`,
            },
          });
        }
      );
      const logs = await listLogs(
        { itemIds: ["item-1", "item-2"], userId: "user-1" },
        httpClient(fetch)
      );
      expect(logs.map(({ id }) => id)).toEqual(rows.map(({ id }) => id));
      expect(offsets).toEqual(
        length > 0
          ? Array.from(
              { length: Math.ceil(length / serverCap) },
              (_, i) => i * serverCap
            )
          : [0]
      );
      if (length) {
        expect(logs[0]).toMatchObject({
          actedAtUtc: "2026-04-03T01:00:00.000Z",
          scheduledAtUtc: "2026-04-03T00:00:00.000Z",
        });
      }
    }
  );

  it("한 일정 조회도 같은 페이지 경로에서 사용자와 일정 필터를 유지한다", async () => {
    const fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const offset = Number(url.searchParams.get("offset"));
      expect(url.searchParams.get("user_id")).toBe("eq.user-1");
      expect(url.searchParams.get("item_id")).toBe("in.(item-1)");
      return new Response(JSON.stringify([{ ...row, id: `log-${offset}` }]), {
        headers: { "content-range": `${offset}-${offset}/2` },
      });
    });
    await expect(
      listItemLogs({ itemId: "item-1", userId: "user-1" }, httpClient(fetch))
    ).resolves.toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("빈 일정 ID는 요청하지 않고 생략한 ID는 사용자 전체를 조회한다", async () => {
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

  it.each(["error", "empty", "missing-count"])(
    "후속 페이지 %s를 부분 성공으로 반환하지 않는다",
    async (failure) => {
      const fetch = jest
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify([row]), {
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
      expect(fetch).toHaveBeenCalledTimes(2);
    }
  );

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
