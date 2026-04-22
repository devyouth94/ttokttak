import {
  cancelNotificationDeliveryJobs,
  listNotificationDeliveryJobs,
  upsertNotificationDeliveryJobs,
} from "~/features/recurring/repositories/notification-delivery-jobs-repository";
import { createAwaitableQuery } from "~/features/recurring/repositories/repository-test-helpers";

describe("notification delivery jobs repository", () => {
  it("발송 job 목록을 상태와 범위 기준으로 조회한다", async () => {
    const row = {
      body: "복약 시간입니다.",
      cancel_reason: null,
      cancelled_at: null,
      completed_at: null,
      created_at: "2026-04-16T00:00:00.000Z",
      dedupe_key: "reminder:user-1:item-1:2026-04-17T00:00:00.000Z",
      deliver_at_utc: "2026-04-17T00:00:00.000Z",
      failure_count: 0,
      id: "job-1",
      item_id: "item-1",
      item_scheduled_at_utc: "2026-04-17T00:00:00.000Z",
      last_attempted_at: null,
      next_retry_at: null,
      notification_kind: "reminder",
      payload: { source: "recurring-item" },
      retry_count: 0,
      status: "pending",
      success_count: 0,
      target_token_count: 0,
      title: "약 먹기",
      updated_at: "2026-04-16T00:00:00.000Z",
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

    const jobs = await listNotificationDeliveryJobs({
      client: { from } as never,
      itemIds: ["item-1"],
      rangeEndUtc: "2026-04-18T00:00:00.000Z",
      rangeStartUtc: "2026-04-16T00:00:00.000Z",
      statuses: ["pending", "retrying"],
      userId: "user-1",
    });

    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.gte).toHaveBeenCalledWith(
      "item_scheduled_at_utc",
      "2026-04-16T00:00:00.000Z"
    );
    expect(query.lte).toHaveBeenCalledWith(
      "item_scheduled_at_utc",
      "2026-04-18T00:00:00.000Z"
    );
    expect(query.in).toHaveBeenNthCalledWith(1, "item_id", ["item-1"]);
    expect(query.in).toHaveBeenNthCalledWith(2, "status", [
      "pending",
      "retrying",
    ]);
    expect(jobs[0]?.dedupeKey).toBe(
      "reminder:user-1:item-1:2026-04-17T00:00:00.000Z"
    );
  });

  it("dedupe key 기준으로 bulk upsert 한다", async () => {
    const select = jest.fn().mockResolvedValue({
      data: [
        {
          body: "복약 시간입니다.",
          cancel_reason: null,
          cancelled_at: null,
          completed_at: null,
          created_at: "2026-04-16T00:00:00.000Z",
          dedupe_key: "reminder:user-1:item-1:2026-04-17T00:00:00.000Z",
          deliver_at_utc: "2026-04-17T00:00:00.000Z",
          failure_count: 0,
          id: "job-1",
          item_id: "item-1",
          item_scheduled_at_utc: "2026-04-17T00:00:00.000Z",
          last_attempted_at: null,
          next_retry_at: null,
          notification_kind: "reminder",
          payload: { source: "recurring-item" },
          retry_count: 0,
          status: "pending",
          success_count: 0,
          target_token_count: 0,
          title: "약 먹기",
          updated_at: "2026-04-16T00:00:00.000Z",
          user_id: "user-1",
        },
      ],
      error: null,
    });
    const upsert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ upsert }));

    const jobs = await upsertNotificationDeliveryJobs(
      [
        {
          body: "복약 시간입니다.",
          dedupeKey: "reminder:user-1:item-1:2026-04-17T00:00:00.000Z",
          deliverAtUtc: "2026-04-17T00:00:00.000Z",
          itemId: "item-1",
          itemScheduledAtUtc: "2026-04-17T00:00:00.000Z",
          notificationKind: "reminder",
          payload: { source: "recurring-item" },
          title: "약 먹기",
          userId: "user-1",
        },
      ],
      { from } as never
    );

    expect(upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          dedupe_key: "reminder:user-1:item-1:2026-04-17T00:00:00.000Z",
          item_id: "item-1",
          notification_kind: "reminder",
          status: "pending",
          user_id: "user-1",
        }),
      ],
      { onConflict: "dedupe_key" }
    );
    expect(jobs).toHaveLength(1);
  });

  it("취소 대상 id가 없으면 update를 호출하지 않는다", async () => {
    const from = jest.fn();

    await cancelNotificationDeliveryJobs({
      cancelReason: "schedule-updated",
      client: { from } as never,
      jobIds: [],
      userId: "user-1",
    });

    expect(from).not.toHaveBeenCalled();
  });
});
