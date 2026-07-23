import {
  createContentDecryptor,
  decryptContent,
  encryptContent,
} from "~/schedule/content/cipher";

import {
  archiveItem,
  createItem,
  getItem,
  listItems,
  updateItem,
} from "./items";
import { listItemLogs } from "./logs";

jest.mock("~/supabase", () => ({ supabase: {} }));
jest.mock("~/schedule/content/cipher", () => ({
  createContentDecryptor: jest.fn(),
  decryptContent: jest.fn(),
  encryptContent: jest.fn(),
}));
jest.mock("./logs", () => ({ listItemLogs: jest.fn() }));

const row = {
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
  return {
    client: {
      from: jest.fn(() => ({ select: jest.fn(() => query) })),
      rpc,
    } as never,
    query,
    rpc,
  };
}

const input = {
  anchorType: "fixed" as const,
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
    jest.mocked(listItemLogs).mockResolvedValue([]);
  });

  it("일정 목록을 조회하고 row와 암호문을 일정으로 변환한다", async () => {
    const { client, query } = createClient();

    const items = await listItems({ userId: "user-1" }, client);

    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.eq).toHaveBeenCalledWith("is_archived", false);
    expect(query.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(items[0]).toMatchObject({
      colorKey: "blue",
      description: "하루 8잔",
      title: "물 마시기",
      versions: [
        expect.objectContaining({
          recurrenceType: "daily",
          reminderTimeLocal: "09:00",
        }),
      ],
    });
  });

  it("복호화 실패를 복구 불가 일정으로 제공하고 수정을 막는다", async () => {
    jest.mocked(decryptContent).mockRejectedValue(new Error("복호화 실패"));
    const { client, rpc } = createClient();

    await expect(
      getItem({ id: "item-1", userId: "user-1" }, client)
    ).resolves.toMatchObject({
      contentStatus: "unrecoverable",
      description: null,
      title: "일정 내용을 복구할 수 없어요",
    });
    await expect(
      updateItem(
        {
          id: "item-1",
          patch: { title: "다시 저장" },
          timezone: "Asia/Seoul",
          userId: "user-1",
        },
        client
      )
    ).rejects.toThrow("내용을 복구할 수 없는 일정은 수정할 수 없습니다.");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("새 일정을 암호화하고 기본 색상과 초기 규칙 버전을 RPC로 저장한다", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: "item-1", error: null });
    const { client } = createClient(createQuery(), rpc);

    await createItem(
      { ...input, endDateLocal: "2026-05-09", recurrenceType: "once" },
      client
    );

    expect(rpc).toHaveBeenCalledWith(
      "create_recurring_item_with_initial_version",
      expect.objectContaining({
        p_color_key: "red",
        p_description_ciphertext: "encrypted-description",
        p_end_date_local: null,
        p_title_ciphertext: "encrypted-title",
      })
    );
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_title");
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_description");
  });

  it("일정 수정 결과와 암호문을 RPC로 저장한다", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    const { client } = createClient(createQuery(), rpc);

    await updateItem(
      {
        id: "item-1",
        patch: { colorKey: "purple", title: "영양제" },
        timezone: "Asia/Seoul",
        userId: "user-1",
      },
      client
    );

    expect(encryptContent).toHaveBeenCalledWith({
      description: "하루 8잔",
      title: "영양제",
      userId: "user-1",
    });
    expect(rpc).toHaveBeenCalledWith(
      "update_recurring_item_with_edit_policy",
      expect.objectContaining({
        p_color_key: "purple",
        p_description_ciphertext: "encrypted-description",
        p_title_ciphertext: "encrypted-title",
      })
    );
  });

  it("일정을 RPC로 보관 처리한다", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    const { client } = createClient(createQuery(), rpc);

    await archiveItem("item-1", client);

    expect(rpc).toHaveBeenCalledWith("archive_recurring_item", {
      p_item_id: "item-1",
    });
  });
});
