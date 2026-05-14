import {
  createCompletionLog,
  getCompletionLogAnchorBeforeRange,
  listCompletionLogs,
  listCompletionLogsForItemHistory,
  listCompletionLogsInRange,
} from "~/features/recurring/repositories/completion-logs-repository";
import { createAwaitableQuery } from "~/features/recurring/repositories/repository-test-helpers";

describe("completion logs repository", () => {
  it("item 기준으로 completion log 전체 목록을 조회한다", async () => {
    const row = {
      acted_at_utc: "2026-04-03T01:00:00.000Z",
      action: "completed",
      created_at: "2026-04-03T01:00:00.000Z",
      device_id: "device-1",
      id: "log-1",
      item_id: "item-1",
      scheduled_at_utc: "2026-04-03T00:00:00.000Z",
      user_id: "user-1",
    };
    const query = createAwaitableQuery(
      {
        data: [row],
        error: null,
      },
      ["eq", "in", "order"]
    );
    const from = jest.fn(() => ({
      select: jest.fn(() => query),
    }));

    const logs = await listCompletionLogs({
      client: { from } as never,
      itemIds: ["item-1"],
      userId: "user-1",
    });

    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.in).toHaveBeenCalledWith("item_id", ["item-1"]);
    expect(logs[0]?.scheduledAtUtc).toBe("2026-04-03T00:00:00.000Z");
  });

  it("상세 히스토리는 최신 예정 시각 5건만 조회한다", async () => {
    const row = {
      acted_at_utc: "2026-04-03T01:00:00.000Z",
      action: "completed",
      created_at: "2026-04-03T01:00:00.000Z",
      device_id: "device-1",
      id: "log-1",
      item_id: "item-1",
      scheduled_at_utc: "2026-04-03T00:00:00.000Z",
      user_id: "user-1",
    };
    const query = createAwaitableQuery(
      {
        data: [row],
        error: null,
      },
      ["eq", "limit", "order"]
    );
    const from = jest.fn(() => ({
      select: jest.fn(() => query),
    }));

    await listCompletionLogsForItemHistory({
      client: { from } as never,
      itemId: "item-1",
      userId: "user-1",
    });

    expect(query.eq).toHaveBeenNthCalledWith(1, "item_id", "item-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
    expect(query.order).toHaveBeenCalledWith("scheduled_at_utc", {
      ascending: false,
    });
    expect(query.limit).toHaveBeenCalledWith(5);
  });

  it("completion_based anchor는 item별로 범위 시작 전 최신 완료 1건만 조회한다", async () => {
    const row = {
      acted_at_utc: "2026-04-02T01:00:00.000Z",
      action: "completed",
      created_at: "2026-04-02T01:00:00.000Z",
      device_id: null,
      id: "log-1",
      item_id: "item-1",
      scheduled_at_utc: "2026-04-02T00:00:00.000Z",
      user_id: "user-1",
    };
    const query = createAwaitableQuery(
      {
        data: [row],
        error: null,
      },
      ["eq", "limit", "lt", "order"]
    );
    const from = jest.fn(() => ({
      select: jest.fn(() => query),
    }));

    await getCompletionLogAnchorBeforeRange({
      client: { from } as never,
      itemId: "item-1",
      rangeStartUtc: "2026-04-03T00:00:00.000Z",
      userId: "user-1",
    });

    expect(query.eq).toHaveBeenNthCalledWith(1, "user_id", "user-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "item_id", "item-1");
    expect(query.eq).toHaveBeenNthCalledWith(3, "action", "completed");
    expect(query.lt).toHaveBeenCalledWith(
      "acted_at_utc",
      "2026-04-03T00:00:00.000Z"
    );
    expect(query.order).toHaveBeenCalledWith("acted_at_utc", {
      ascending: false,
    });
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it("범위 안의 completion log를 조회한다", async () => {
    const row = {
      acted_at_utc: "2026-04-03T01:00:00.000Z",
      action: "completed",
      created_at: "2026-04-03T01:00:00.000Z",
      device_id: "device-1",
      id: "log-1",
      item_id: "item-1",
      scheduled_at_utc: "2026-04-03T00:00:00.000Z",
      user_id: "user-1",
    };
    const query = createAwaitableQuery(
      {
        data: [row],
        error: null,
      },
      ["eq", "gte", "in", "lte", "order"]
    );
    const from = jest.fn(() => ({
      select: jest.fn(() => query),
    }));

    const logs = await listCompletionLogsInRange({
      client: { from } as never,
      itemIds: ["item-1"],
      rangeEndUtc: "2026-04-04T00:00:00.000Z",
      rangeStartUtc: "2026-04-02T00:00:00.000Z",
      userId: "user-1",
    });

    expect(query.gte).toHaveBeenCalledWith(
      "scheduled_at_utc",
      "2026-04-02T00:00:00.000Z"
    );
    expect(query.lte).toHaveBeenCalledWith(
      "scheduled_at_utc",
      "2026-04-04T00:00:00.000Z"
    );
    expect(logs).toHaveLength(1);
  });

  it("completion log를 생성한다", async () => {
    const row = {
      acted_at_utc: "2026-04-03T01:00:00.000Z",
      action: "completed",
      created_at: "2026-04-03T01:00:00.000Z",
      device_id: "device-1",
      id: "log-1",
      item_id: "item-1",
      scheduled_at_utc: "2026-04-03T00:00:00.000Z",
      user_id: "user-1",
    };
    const single = jest.fn().mockResolvedValue({
      data: row,
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));

    const log = await createCompletionLog(
      {
        action: "completed",
        deviceId: "device-1",
        itemId: "item-1",
        scheduledAtUtc: "2026-04-03T00:00:00.000Z",
        userId: "user-1",
      },
      { from } as never
    );

    expect(insert).toHaveBeenCalledWith({
      acted_at_utc: undefined,
      action: "completed",
      device_id: "device-1",
      item_id: "item-1",
      scheduled_at_utc: "2026-04-03T00:00:00.000Z",
      user_id: "user-1",
    });
    expect(log.action).toBe("completed");
  });

  it("DB에서 받은 UTC 문자열을 ISO 형식으로 정규화한다", async () => {
    const row = {
      acted_at_utc: "2026-04-03 01:00:00+00",
      action: "completed",
      created_at: "2026-04-03 01:00:00+00",
      device_id: null,
      id: "log-1",
      item_id: "item-1",
      scheduled_at_utc: "2026-04-03 00:00:00+00",
      user_id: "user-1",
    };
    const query = createAwaitableQuery(
      {
        data: [row],
        error: null,
      },
      ["eq", "in", "order"]
    );
    const from = jest.fn(() => ({
      select: jest.fn(() => query),
    }));

    const logs = await listCompletionLogs({
      client: { from } as never,
      itemIds: ["item-1"],
      userId: "user-1",
    });

    expect(logs[0]).toMatchObject({
      actedAtUtc: "2026-04-03T01:00:00.000Z",
      createdAt: "2026-04-03T01:00:00.000Z",
      scheduledAtUtc: "2026-04-03T00:00:00.000Z",
    });
  });
});
