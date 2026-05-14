import { createSupabaseRecurringItemsPersistence } from "~/features/recurring/repositories/recurring-items-persistence";
import { createAwaitableQuery } from "~/features/recurring/repositories/repository-test-helpers";

const recurringItemRow = {
  color_key: "blue",
  content_encryption_metadata: {
    algorithm: "test",
  },
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

describe("recurring items persistence", () => {
  it("일정 목록 조회는 Supabase row를 저장된 일정 의미로 변환한다", async () => {
    const query = createAwaitableQuery(
      {
        data: [recurringItemRow],
        error: null,
      },
      ["eq", "limit", "order"]
    );
    const from = jest.fn(() => ({
      select: jest.fn(() => query),
    }));
    const persistence = createSupabaseRecurringItemsPersistence({
      from,
    } as never);

    const items = await persistence.listItems({
      includeArchived: false,
      limit: 500,
      userId: "user-1",
    });

    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.eq).toHaveBeenCalledWith("is_archived", false);
    expect(query.limit).toHaveBeenCalledWith(500);
    expect(items[0]).toMatchObject({
      colorKey: "blue",
      contentKeyVersion: 1,
      id: "item-1",
      scheduleVersions: [
        expect.objectContaining({
          itemId: "item-1",
          recurrenceType: "daily",
          reminderTimeLocal: "09:00:00",
        }),
      ],
      titleCiphertext: "encrypted-title",
      userId: "user-1",
    });
  });

  it("일정 목록 조회는 제목/설명 암호문으로 서버 정렬하지 않는다", async () => {
    const query = createAwaitableQuery(
      {
        data: [recurringItemRow],
        error: null,
      },
      ["eq", "limit", "order"]
    );
    const from = jest.fn(() => ({
      select: jest.fn(() => query),
    }));
    const persistence = createSupabaseRecurringItemsPersistence({
      from,
    } as never);

    await persistence.listItems({
      includeArchived: false,
      limit: 500,
      userId: "user-1",
    });

    expect(query.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(query.order).not.toHaveBeenCalledWith(
      expect.stringMatching(/title|description/),
      expect.anything()
    );
  });

  it("신규 일정 저장 요청을 Supabase RPC 인자로 변환한다", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: "item-1",
      error: null,
    });
    const persistence = createSupabaseRecurringItemsPersistence({
      rpc,
    } as never);

    const itemId = await persistence.createItemWithInitialVersion({
      anchorType: "fixed",
      colorKey: "red",
      contentEncryptionMetadata: {
        algorithm: "test",
      },
      contentKeyVersion: 1,
      descriptionCiphertext: "encrypted-description",
      effectiveFromUtc: "2026-05-05T15:00:00.000Z",
      intervalValue: null,
      isArchived: false,
      notificationsEnabled: true,
      recurrenceType: "daily",
      reminderTimeLocal: "09:00",
      seedStartDateLocal: "2026-05-06",
      startDateLocal: "2026-05-06",
      titleCiphertext: "encrypted-title",
      userId: "user-1",
      weekdayMask: null,
    });

    expect(itemId).toBe("item-1");
    expect(rpc).toHaveBeenCalledWith(
      "create_recurring_item_with_initial_version",
      expect.objectContaining({
        p_color_key: "red",
        p_content_encryption_metadata: { algorithm: "test" },
        p_content_key_version: 1,
        p_description_ciphertext: "encrypted-description",
        p_title_ciphertext: "encrypted-title",
      })
    );
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_title");
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_description");
  });

  it("일정 수정 저장 요청을 Supabase RPC 인자로 변환한다", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: "item-1",
      error: null,
    });
    const persistence = createSupabaseRecurringItemsPersistence({
      rpc,
    } as never);

    await persistence.updateItemWithEditPolicy({
      anchorType: null,
      colorKey: "purple",
      contentEncryptionMetadata: {
        algorithm: "test",
      },
      contentKeyVersion: 1,
      descriptionCiphertext: "encrypted-description",
      effectiveFromUtc: "2026-05-06T00:00:00.000Z",
      hasRuleChanges: false,
      intervalValue: null,
      isArchived: false,
      itemId: "item-1",
      notificationsEnabled: null,
      recurrenceType: null,
      reminderTimeLocal: null,
      seedStartDateLocal: null,
      titleCiphertext: "encrypted-title",
      userId: "user-1",
      weekdayMask: null,
    });

    expect(rpc).toHaveBeenCalledWith(
      "update_recurring_item_with_edit_policy",
      expect.objectContaining({
        p_color_key: "purple",
        p_content_encryption_metadata: { algorithm: "test" },
        p_content_key_version: 1,
        p_description_ciphertext: "encrypted-description",
        p_title_ciphertext: "encrypted-title",
      })
    );
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_title");
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_description");
  });

  it("일정 보관 저장 요청을 Supabase RPC로 위임한다", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const persistence = createSupabaseRecurringItemsPersistence({
      rpc,
    } as never);

    await persistence.archiveItem({
      id: "item-1",
    });

    expect(rpc).toHaveBeenCalledWith("archive_recurring_item", {
      p_item_id: "item-1",
    });
  });
});
