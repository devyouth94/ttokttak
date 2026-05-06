import {
  archiveRecurringItem,
  createRecurringItem,
  getRecurringItemById,
  updateRecurringItem,
} from "~/features/recurring/repositories/recurring-items-repository";

const recurringItemRow = {
  id: "item-1",
  user_id: "user-1",
  title: "물 마시기",
  description: null,
  category: null,
  color_key: "blue",
  start_date_local: "2026-05-06",
  is_archived: false,
  created_at: "2026-05-06T00:00:00.000Z",
  updated_at: "2026-05-06T00:00:00.000Z",
  recurring_item_schedule_versions: [
    {
      id: "version-1",
      item_id: "item-1",
      user_id: "user-1",
      effective_from_utc: "2026-05-05T15:00:00.000Z",
      recurrence_type: "daily",
      interval_value: null,
      weekday_mask: null,
      reminder_time_local: "09:00:00",
      anchor_type: "fixed",
      seed_start_date_local: "2026-05-06",
      notifications_enabled: true,
      created_at: "2026-05-06T00:00:00.000Z",
    },
  ],
};

function createRecurringItemsSelectClient() {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: recurringItemRow,
    error: null,
  });
  type QueryDouble = {
    eq: jest.Mock<QueryDouble, unknown[]>;
    maybeSingle: typeof maybeSingle;
    select: jest.Mock<QueryDouble, unknown[]>;
  };
  const query = {} as QueryDouble;

  query.eq = jest.fn(() => query);
  query.maybeSingle = maybeSingle;
  query.select = jest.fn(() => query);

  return {
    from: jest.fn(() => query),
    query,
  };
}

describe("recurring items repository", () => {
  it("신규 일정 생성은 색상을 명시하지 않아도 기본 일정 색상 red를 저장한다", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: "item-1",
      error: null,
    });
    const { from } = createRecurringItemsSelectClient();

    await createRecurringItem(
      {
        anchorType: "fixed",
        category: null,
        description: null,
        intervalValue: null,
        isArchived: false,
        notificationsEnabled: true,
        recurrenceType: "daily",
        reminderTimeLocal: "09:00",
        startDateLocal: "2026-05-06",
        timezone: "Asia/Seoul",
        title: "물 마시기",
        userId: "user-1",
        weekdayMask: null,
      },
      { from, rpc } as never
    );

    expect(rpc).toHaveBeenCalledWith(
      "create_recurring_item_with_initial_version",
      expect.objectContaining({
        p_color_key: "red",
      })
    );
  });

  it("일정 조회는 저장된 일정 색상 key를 도메인 값으로 제공한다", async () => {
    const { from } = createRecurringItemsSelectClient();

    const item = await getRecurringItemById({
      client: { from } as never,
      id: "item-1",
      timezone: "Asia/Seoul",
      userId: "user-1",
    });

    expect(item.colorKey).toBe("blue");
  });

  it("일정 수정은 변경한 일정 색상 key를 저장 인자로 보존한다", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: "item-1",
      error: null,
    });
    const { from } = createRecurringItemsSelectClient();

    await updateRecurringItem(
      {
        id: "item-1",
        patch: { colorKey: "purple" },
        timezone: "Asia/Seoul",
        userId: "user-1",
      },
      { from, rpc } as never
    );

    expect(rpc).toHaveBeenCalledWith(
      "update_recurring_item_with_edit_policy",
      expect.objectContaining({
        p_color_key: "purple",
      })
    );
  });

  it("일정 삭제는 archive와 pending job 취소를 묶은 RPC로 처리한다", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    await archiveRecurringItem({
      client: { rpc } as never,
      id: "item-1",
      userId: "user-1",
    });

    expect(rpc).toHaveBeenCalledWith("archive_recurring_item", {
      p_item_id: "item-1",
    });
  });
});
