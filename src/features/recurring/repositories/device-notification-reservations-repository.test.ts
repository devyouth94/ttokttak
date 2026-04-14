import {
  deleteDeviceNotificationReservations,
  deleteFutureDeviceNotificationReservations,
  listDeviceNotificationReservations,
  upsertDeviceNotificationReservations,
} from "~/features/recurring/repositories/device-notification-reservations-repository";
import { createAwaitableQuery } from "~/features/recurring/repositories/repository-test-helpers";

describe("device notification reservations repository", () => {
  it("기기 예약 목록을 범위와 item 기준으로 조회한다", async () => {
    const row = {
      id: "reservation-1",
      user_id: "user-1",
      device_id: "device-1",
      item_id: "item-1",
      scheduled_at_utc: "2026-04-03T00:00:00.000Z",
      local_notification_id: "local-1",
      created_at: "2026-04-02T00:00:00.000Z",
      updated_at: "2026-04-02T00:00:00.000Z",
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

    const reservations = await listDeviceNotificationReservations({
      client: { from } as never,
      deviceId: "device-1",
      itemIds: ["item-1"],
      rangeStartUtc: "2026-04-02T00:00:00.000Z",
      rangeEndUtc: "2026-04-04T00:00:00.000Z",
      userId: "user-1",
    });

    expect(query.eq).toHaveBeenNthCalledWith(1, "device_id", "device-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
    expect(query.gte).toHaveBeenCalledWith(
      "scheduled_at_utc",
      "2026-04-02T00:00:00.000Z"
    );
    expect(query.lte).toHaveBeenCalledWith(
      "scheduled_at_utc",
      "2026-04-04T00:00:00.000Z"
    );
    expect(query.in).toHaveBeenCalledWith("item_id", ["item-1"]);
    expect(reservations[0]?.localNotificationId).toBe("local-1");
  });

  it("reservation 키 기준으로 bulk upsert 한다", async () => {
    const select = jest.fn().mockResolvedValue({
      data: [
        {
          id: "reservation-1",
          user_id: "user-1",
          device_id: "device-1",
          item_id: "item-1",
          scheduled_at_utc: "2026-04-03T00:00:00.000Z",
          local_notification_id: "local-1",
          created_at: "2026-04-02T00:00:00.000Z",
          updated_at: "2026-04-02T00:00:00.000Z",
        },
      ],
      error: null,
    });
    const upsert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ upsert }));

    const reservations = await upsertDeviceNotificationReservations(
      [
        {
          deviceId: "device-1",
          itemId: "item-1",
          localNotificationId: "local-1",
          scheduledAtUtc: "2026-04-03T00:00:00.000Z",
          userId: "user-1",
        },
      ],
      { from } as never
    );

    expect(upsert).toHaveBeenCalledWith(
      [
        {
          id: undefined,
          user_id: "user-1",
          device_id: "device-1",
          item_id: "item-1",
          scheduled_at_utc: "2026-04-03T00:00:00.000Z",
          local_notification_id: "local-1",
        },
      ],
      { onConflict: "device_id,item_id,scheduled_at_utc" }
    );
    expect(reservations).toHaveLength(1);
  });

  it("삭제 대상 id가 없으면 delete를 호출하지 않는다", async () => {
    const from = jest.fn();

    await deleteDeviceNotificationReservations({
      client: { from } as never,
      deviceId: "device-1",
      reservationIds: [],
      userId: "user-1",
    });

    expect(from).not.toHaveBeenCalled();
  });

  it("수정 시점 이후 미래 reservation만 삭제한다", async () => {
    const query = createAwaitableQuery(
      {
        data: null,
        error: null,
      },
      ["delete", "eq", "gte"]
    );
    const from = jest.fn(() => query);

    await deleteFutureDeviceNotificationReservations({
      client: { from } as never,
      deviceId: "device-1",
      effectiveFromUtc: "2026-04-14T01:00:00.000Z",
      itemId: "item-1",
      userId: "user-1",
    });

    expect(query.eq).toHaveBeenNthCalledWith(1, "device_id", "device-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
    expect(query.eq).toHaveBeenNthCalledWith(3, "item_id", "item-1");
    expect(query.gte).toHaveBeenCalledWith(
      "scheduled_at_utc",
      "2026-04-14T01:00:00.000Z"
    );
  });
});
