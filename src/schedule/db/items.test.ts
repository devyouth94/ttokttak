import {
  createClient as createSupabaseClient,
  FunctionsFetchError,
} from "@supabase/supabase-js";

import type { Database } from "~/database.types";

import { createItem, getItem, listItems } from "./items";
import {
  createContentDecryptor,
  decryptContent,
  encryptContent,
} from "../content/cipher";
import {
  ScheduleContentUnrecoverableError,
  ScheduleNotFoundError,
} from "../errors";

jest.mock("~/supabase", () => ({ supabase: {} }));
jest.mock("~/schedule/content/cipher", () => ({
  createContentDecryptor: jest.fn(),
  decryptContent: jest.fn(),
  encryptContent: jest.fn(),
}));

const row = {
  color_hex: "#9DB7F5",
  color_key: "blue",
  content_encryption_metadata: { algorithm: "test" },
  content_key_version: 1,
  created_at: "2026-05-06T00:00:00.000Z",
  description_ciphertext: "encrypted-description",
  id: "item-1",
  is_archived: false,
  recurring_item_schedule_versions: [
    {
      anchor_type: "fixed",
      created_at: "2026-05-06T00:00:00.000Z",
      effective_from_utc: "2026-05-05T15:00:00.000Z",
      end_date_local: null,
      id: "version-1",
      interval_value: null,
      item_id: "item-1",
      notifications_enabled: true,
      recurrence_type: "daily",
      reminder_time_local: "09:00:00",
      seed_start_date_local: "2026-05-06",
      user_id: "user-1",
      weekday_mask: null,
    },
  ],
  start_date_local: "2026-05-06",
  title_ciphertext: "encrypted-title",
  updated_at: "2026-05-06T00:00:00.000Z",
  user_id: "user-1",
};

function createQuery(data: unknown = row) {
  const query = {
    eq: jest.fn(),
    limit: jest.fn().mockResolvedValue({ data: [data], error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data, error: null }),
    order: jest.fn(),
  };
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return query;
}

function createClient(query = createQuery(), rpc = jest.fn()) {
  const from = jest.fn(() => ({ select: jest.fn(() => query) }));

  return {
    client: {
      from,
      rpc,
    } as never,
    from,
    query,
    rpc,
  };
}

const input = {
  anchorType: "fixed" as const,
  colorHex: "#F5A3A3",
  description: "하루 8잔",
  endDateLocal: null,
  intervalValue: null,
  notificationsEnabled: true,
  recurrenceType: "daily" as const,
  reminderTimeLocal: "09:00",
  startDateLocal: "2026-05-06",
  timezone: "Asia/Seoul",
  title: "물 마시기",
  userId: "user-1",
  weekdayMask: null,
};

describe("schedule items DB", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(decryptContent).mockResolvedValue({
      description: "하루 8잔",
      title: "물 마시기",
    });
    jest.mocked(createContentDecryptor).mockReturnValue(decryptContent);
    jest.mocked(encryptContent).mockResolvedValue({
      descriptionCiphertext: "encrypted-description",
      keyVersion: 1,
      metadata: { algorithm: "test" },
      titleCiphertext: "encrypted-title",
    });
  });

  it("일정을 복호화하고 순서 없이 받은 규칙 버전을 적용 시각순으로 정렬한다", async () => {
    const originalVersion = row.recurring_item_schedule_versions[0]!;
    const { client, query } = createClient(
      createQuery({
        ...row,
        recurring_item_schedule_versions: [
          {
            ...originalVersion,
            id: "version-2",
            effective_from_utc: "2026-05-07T00:00:00.000Z",
            reminder_time_local: "21:00:00",
          },
          originalVersion,
        ],
      })
    );

    const items = await listItems({ userId: "user-1" }, client);

    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.eq).toHaveBeenCalledWith("is_archived", false);
    expect(query.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(items[0]).toMatchObject({
      colorHex: "#9DB7F5",
      description: "하루 8잔",
      title: "물 마시기",
      versions: [
        expect.objectContaining({
          recurrenceType: "daily",
          reminderTimeLocal: "09:00",
        }),
        expect.objectContaining({ reminderTimeLocal: "21:00" }),
      ],
    });
  });

  it("복호화 실패를 복구 불가 일정으로 제공한다", async () => {
    jest
      .mocked(decryptContent)
      .mockRejectedValue(new ScheduleContentUnrecoverableError());
    const { client } = createClient();

    await expect(
      getItem({ id: "item-1", userId: "user-1" }, client)
    ).resolves.toMatchObject({
      contentStatus: "unrecoverable",
      description: null,
      title: "",
    });
  });

  it("content key 복구 네트워크 오류는 조회 오류로 유지한다", async () => {
    const error = new FunctionsFetchError(new Error("네트워크 실패"));
    jest.mocked(decryptContent).mockRejectedValue(error);
    const { client } = createClient();

    await expect(
      getItem({ id: "item-1", userId: "user-1" }, client)
    ).rejects.toBe(error);
  });

  it("지정한 사용자와 일정 ID로 조회하고 빈 결과는 일정 없음으로 구분한다", async () => {
    const fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/rest/v1/recurring_items");
      expect(url.searchParams.get("id")).toBe("eq.item-1");
      expect(url.searchParams.get("user_id")).toBe("eq.user-1");
      return new Response("[]");
    });
    const client = createSupabaseClient<Database>(
      "https://example.supabase.co",
      "test-key",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: { fetch },
      }
    );

    await expect(
      getItem({ id: "item-1", userId: "user-1" }, client)
    ).rejects.toBeInstanceOf(ScheduleNotFoundError);
  });

  it("일정 조회 오류는 원본을 유지한다", async () => {
    const error = new Error("조회 실패");
    const query = createQuery(null);
    query.maybeSingle.mockResolvedValue({ data: null, error });
    const { client } = createClient(query);

    await expect(
      getItem({ id: "item-1", userId: "user-1" }, client)
    ).rejects.toBe(error);
  });

  it("새 일정을 암호화하고 초기 규칙 버전을 RPC로 저장한다", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: "item-1", error: null });
    const { client, from } = createClient(createQuery(), rpc);

    await createItem(input, client);

    expect(encryptContent).toHaveBeenCalledWith({
      description: input.description,
      title: input.title,
      userId: input.userId,
    });

    expect(rpc).toHaveBeenCalledWith(
      "create_recurring_item_with_initial_version",
      expect.objectContaining({
        p_color_hex: "#F5A3A3",
        p_color_key: "red",
        p_description_ciphertext: "encrypted-description",
        p_end_date_local: null,
        p_title_ciphertext: "encrypted-title",
      })
    );
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_title");
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_description");
    expect(from).not.toHaveBeenCalled();
  });
});
