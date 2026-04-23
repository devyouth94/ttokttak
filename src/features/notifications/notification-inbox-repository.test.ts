import {
  hideNotificationInboxItem,
  hideNotificationInboxItems,
  listNotificationInboxItems,
  markAllNotificationInboxItemsRead,
  markNotificationInboxItemRead,
  markNotificationInboxItemsRead,
} from "~/features/notifications/notification-inbox-repository";
import { createAwaitableQuery } from "~/features/recurring/repositories/repository-test-helpers";

describe("notification inbox repository", () => {
  it("로그인 사용자의 성공한 원격 푸시 기반 inbox 알림만 최신순으로 조회한다", async () => {
    const row = {
      body: "복약 시간입니다.",
      created_at: "2026-04-23T09:00:00.000Z",
      delivered_at_utc: "2026-04-23T09:00:00.000Z",
      hidden_at: null,
      id: "inbox-1",
      item_id: "item-1",
      item_scheduled_at_utc: "2026-04-23T09:00:00.000Z",
      notification_kind: "reminder",
      payload: {
        itemId: "item-1",
        notificationKind: "reminder",
        scheduledAtUtc: "2026-04-23T09:00:00.000Z",
        source: "recurring-item",
      },
      read_at: null,
      recurring_items: {
        is_archived: true,
      },
      source_job_id: "job-1",
      title: "약 먹기",
      updated_at: "2026-04-23T09:00:00.000Z",
      user_id: "user-1",
    };
    const query = createAwaitableQuery(
      {
        data: [row],
        error: null,
      },
      ["eq", "is", "limit", "order"]
    );
    const select = jest.fn(() => query);
    const from = jest.fn(() => ({
      select,
    }));

    const items = await listNotificationInboxItems({
      client: { from } as never,
      limit: 20,
      userId: "user-1",
    });

    expect(from).toHaveBeenCalledWith("notification_inbox_items");
    expect(select).toHaveBeenCalledWith("*, recurring_items(is_archived)");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.is).toHaveBeenCalledWith("hidden_at", null);
    expect(query.order).toHaveBeenCalledWith("delivered_at_utc", {
      ascending: false,
    });
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(items).toEqual([
      expect.objectContaining({
        deliveredAtUtc: "2026-04-23T09:00:00.000Z",
        id: "inbox-1",
        isItemArchived: true,
        itemId: "item-1",
        notificationKind: "reminder",
        readAt: null,
        title: "약 먹기",
        userId: "user-1",
      }),
    ]);
  });

  it("device delivery record를 join하지 않고 logical inbox row만 조회한다", async () => {
    const query = createAwaitableQuery(
      {
        data: [],
        error: null,
      },
      ["eq", "is", "order"]
    );
    const select = jest.fn(() => query);
    const from = jest.fn(() => ({
      select,
    }));

    const items = await listNotificationInboxItems({
      client: { from } as never,
      userId: "user-1",
    });

    expect(items).toEqual([]);
    expect(select).toHaveBeenCalledWith("*, recurring_items(is_archived)");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.is).toHaveBeenCalledWith("hidden_at", null);
  });

  it("알림 탭 시 사용자 소유 inbox row를 읽음 처리한다", async () => {
    const query = createAwaitableQuery(
      {
        data: null,
        error: null,
      },
      ["eq", "is"]
    );
    const update = jest.fn(() => query);
    const from = jest.fn(() => ({
      update,
    }));

    await markNotificationInboxItemRead({
      client: { from } as never,
      id: "inbox-1",
      readAt: "2026-04-23T09:10:00.000Z",
      userId: "user-1",
    });

    expect(from).toHaveBeenCalledWith("notification_inbox_items");
    expect(update).toHaveBeenCalledWith({
      read_at: "2026-04-23T09:10:00.000Z",
    });
    expect(query.eq).toHaveBeenCalledWith("id", "inbox-1");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.is).toHaveBeenCalledWith("hidden_at", null);
  });

  it("전체 읽음은 현재 사용자 inbox에 남아 있는 미읽음 row 전체를 읽음 처리한다", async () => {
    const query = createAwaitableQuery(
      {
        data: null,
        error: null,
      },
      ["eq", "is"]
    );
    const update = jest.fn(() => query);
    const from = jest.fn(() => ({
      update,
    }));

    await markAllNotificationInboxItemsRead({
      client: { from } as never,
      readAt: "2026-04-23T09:15:00.000Z",
      userId: "user-1",
    });

    expect(from).toHaveBeenCalledWith("notification_inbox_items");
    expect(update).toHaveBeenCalledWith({
      read_at: "2026-04-23T09:15:00.000Z",
    });
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.is).toHaveBeenCalledWith("hidden_at", null);
    expect(query.is).toHaveBeenCalledWith("read_at", null);
    expect(query.eq).not.toHaveBeenCalledWith("id", expect.any(String));
  });

  it("선택 읽음은 선택한 사용자 소유 inbox row만 읽음 처리한다", async () => {
    const query = createAwaitableQuery(
      {
        data: null,
        error: null,
      },
      ["eq", "in", "is"]
    );
    const update = jest.fn(() => query);
    const from = jest.fn(() => ({
      update,
    }));

    await markNotificationInboxItemsRead({
      client: { from } as never,
      ids: ["inbox-1", "inbox-2"],
      readAt: "2026-04-23T09:16:00.000Z",
      userId: "user-1",
    });

    expect(from).toHaveBeenCalledWith("notification_inbox_items");
    expect(update).toHaveBeenCalledWith({
      read_at: "2026-04-23T09:16:00.000Z",
    });
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.in).toHaveBeenCalledWith("id", ["inbox-1", "inbox-2"]);
    expect(query.is).toHaveBeenCalledWith("hidden_at", null);
  });

  it("삭제 액션은 현재 사용자 소유 inbox row만 숨기고 발송 attempt log를 변경하지 않는다", async () => {
    const query = createAwaitableQuery(
      {
        data: null,
        error: null,
      },
      ["eq", "is"]
    );
    const update = jest.fn(() => query);
    const deleteRow = jest.fn();
    const from = jest.fn(() => ({
      delete: deleteRow,
      update,
    }));

    await hideNotificationInboxItem({
      client: { from } as never,
      hiddenAt: "2026-04-23T09:20:00.000Z",
      id: "inbox-1",
      userId: "user-1",
    });

    expect(from).toHaveBeenCalledWith("notification_inbox_items");
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalledWith("notification_delivery_jobs");
    expect(from).not.toHaveBeenCalledWith("notification_delivery_attempts");
    expect(update).toHaveBeenCalledWith({
      hidden_at: "2026-04-23T09:20:00.000Z",
    });
    expect(query.eq).toHaveBeenCalledWith("id", "inbox-1");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.is).toHaveBeenCalledWith("hidden_at", null);
    expect(deleteRow).not.toHaveBeenCalled();
  });

  it("선택 삭제는 선택한 사용자 소유 inbox row만 숨긴다", async () => {
    const query = createAwaitableQuery(
      {
        data: null,
        error: null,
      },
      ["eq", "in", "is"]
    );
    const update = jest.fn(() => query);
    const from = jest.fn(() => ({
      update,
    }));

    await hideNotificationInboxItems({
      client: { from } as never,
      hiddenAt: "2026-04-23T09:21:00.000Z",
      ids: ["inbox-1", "inbox-2"],
      userId: "user-1",
    });

    expect(from).toHaveBeenCalledWith("notification_inbox_items");
    expect(update).toHaveBeenCalledWith({
      hidden_at: "2026-04-23T09:21:00.000Z",
    });
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.in).toHaveBeenCalledWith("id", ["inbox-1", "inbox-2"]);
    expect(query.is).toHaveBeenCalledWith("hidden_at", null);
  });
});
