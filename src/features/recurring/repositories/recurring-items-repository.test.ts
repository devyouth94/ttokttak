import {
  archiveRecurringItem,
  createRecurringItem,
  getRecurringItemById,
  listRecurringItems,
  updateRecurringItem,
} from "~/features/recurring/repositories/recurring-items-repository";

const recurringItemRow = {
  id: "item-1",
  user_id: "user-1",
  title_ciphertext: "encrypted-title",
  description_ciphertext: "encrypted-description",
  content_key_version: 1,
  content_encryption_metadata: {
    algorithm: "test",
  },
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

function createRecurringItemsListClient() {
  type QueryResult = {
    data: (typeof recurringItemRow)[];
    error: null;
  };
  type QueryDouble = {
    eq: jest.Mock<QueryDouble, unknown[]>;
    order: jest.Mock<QueryDouble, unknown[]>;
    select: jest.Mock<QueryDouble, unknown[]>;
    then: PromiseLike<QueryResult>["then"];
  };
  const query = {} as QueryDouble;
  const result: QueryResult = {
    data: [recurringItemRow],
    error: null,
  };

  query.eq = jest.fn(() => query);
  query.order = jest.fn(() => query);
  query.select = jest.fn(() => query);
  query.then = ((onfulfilled) =>
    Promise.resolve(
      onfulfilled ? onfulfilled(result) : result
    )) as PromiseLike<QueryResult>["then"];

  return {
    from: jest.fn(() => query),
    query,
  };
}

const contentCipher = {
  decryptRecurringItemContent: jest.fn().mockResolvedValue({
    title: "물 마시기",
    description: "하루 8잔",
  }),
  encryptRecurringItemContent: jest.fn().mockResolvedValue({
    titleCiphertext: "encrypted-title",
    descriptionCiphertext: "encrypted-description",
    keyVersion: 1,
    metadata: {
      algorithm: "test",
    },
  }),
};

describe("recurring items repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("신규 일정 생성은 제목과 설명을 암호화해서 저장하고 조회 시 복호화된 값을 제공한다", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: "item-1",
      error: null,
    });
    const { from } = createRecurringItemsSelectClient();

    const item = await createRecurringItem(
      {
        anchorType: "fixed",
        category: null,
        description: "하루 8잔",
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
      { client: { from, rpc } as never, contentCipher }
    );

    expect(rpc).toHaveBeenCalledWith(
      "create_recurring_item_with_initial_version",
      expect.objectContaining({
        p_content_encryption_metadata: { algorithm: "test" },
        p_content_key_version: 1,
        p_description_ciphertext: "encrypted-description",
        p_title_ciphertext: "encrypted-title",
      })
    );
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_title");
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_description");
    expect(item.title).toBe("물 마시기");
    expect(item.description).toBe("하루 8잔");
  });

  it("일정 목록은 암호문 row를 복호화한 제목과 설명으로 제공한다", async () => {
    const { from } = createRecurringItemsListClient();

    const items = await listRecurringItems({
      client: { from } as never,
      contentCipher,
      timezone: "Asia/Seoul",
      userId: "user-1",
    });

    expect(contentCipher.decryptRecurringItemContent).toHaveBeenCalledWith({
      descriptionCiphertext: "encrypted-description",
      keyVersion: 1,
      metadata: { algorithm: "test" },
      titleCiphertext: "encrypted-title",
      userId: "user-1",
    });
    expect(items[0]?.title).toBe("물 마시기");
    expect(items[0]?.description).toBe("하루 8잔");
  });

  it("일정 목록 조회는 서버에 제목/설명 기반 정렬을 요청하지 않는다", async () => {
    const { from, query } = createRecurringItemsListClient();

    await listRecurringItems({
      client: { from } as never,
      contentCipher,
      timezone: "Asia/Seoul",
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
      { client: { from, rpc } as never, contentCipher }
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
      contentCipher,
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
      { client: { from, rpc } as never, contentCipher }
    );

    expect(rpc).toHaveBeenCalledWith(
      "update_recurring_item_with_edit_policy",
      expect.objectContaining({
        p_color_key: "purple",
      })
    );
  });

  it("일정 수정은 병합한 제목과 설명을 암호화해서 저장한다", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: "item-1",
      error: null,
    });
    const { from } = createRecurringItemsSelectClient();

    await updateRecurringItem(
      {
        id: "item-1",
        patch: {
          description: "저녁 식사 후",
          title: "영양제",
        },
        timezone: "Asia/Seoul",
        userId: "user-1",
      },
      { client: { from, rpc } as never, contentCipher }
    );

    expect(contentCipher.encryptRecurringItemContent).toHaveBeenCalledWith({
      description: "저녁 식사 후",
      title: "영양제",
      userId: "user-1",
    });
    expect(rpc).toHaveBeenCalledWith(
      "update_recurring_item_with_edit_policy",
      expect.objectContaining({
        p_content_encryption_metadata: { algorithm: "test" },
        p_content_key_version: 1,
        p_description_ciphertext: "encrypted-description",
        p_title_ciphertext: "encrypted-title",
      })
    );
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_title");
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_description");
  });

  it("상세 조회는 암호문 row를 복호화한 제목과 설명으로 제공한다", async () => {
    const { from } = createRecurringItemsSelectClient();

    const item = await getRecurringItemById({
      client: { from } as never,
      contentCipher,
      id: "item-1",
      timezone: "Asia/Seoul",
      userId: "user-1",
    });

    expect(item.title).toBe("물 마시기");
    expect(item.description).toBe("하루 8잔");
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
