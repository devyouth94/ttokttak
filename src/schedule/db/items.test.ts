import { listItems } from "./items";
import { createContentDecryptor, decryptContent } from "../content/cipher";
import { ScheduleContentUnrecoverableError } from "../errors";

jest.mock("~/supabase", () => ({ supabase: {} }));
jest.mock("../content/cipher", () => ({
  createContentDecryptor: jest.fn(),
  decryptContent: jest.fn(),
  encryptContent: jest.fn(),
}));

const row = {
  color_hex: "#9DB7F5",
  color_key: "blue",
  content_encryption_metadata: { algorithm: "AES-GCM" },
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

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(createContentDecryptor).mockReturnValue(decryptContent);
});

it("복구 불가 내용은 일정을 없애지 않고 fallback 데이터로 반환한다", async () => {
  jest
    .mocked(decryptContent)
    .mockRejectedValue(new ScheduleContentUnrecoverableError());

  await expect(listItems({ userId: "user-1" }, client())).resolves.toEqual([
    expect.objectContaining({
      contentStatus: "unrecoverable",
      description: null,
      id: "item-1",
      title: "",
    }),
  ]);
});

it("일시적 key 복구 오류는 조회 실패로 전달한다", async () => {
  const error = new Error("key 복구 요청 실패");
  jest.mocked(decryptContent).mockRejectedValue(error);

  await expect(listItems({ userId: "user-1" }, client())).rejects.toBe(error);
});

function client() {
  const query = {
    eq: jest.fn(),
    limit: jest.fn().mockResolvedValue({ data: [row], error: null }),
    order: jest.fn(),
  };
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);

  return {
    from: jest.fn(() => ({ select: jest.fn(() => query) })),
  } as never;
}
