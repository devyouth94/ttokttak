import {
  deactivateDevice,
  listDevices,
  upsertDevice,
} from "~/features/recurring/repositories/devices-repository";
import { createAwaitableQuery } from "~/features/recurring/repositories/repository-test-helpers";

describe("devices repository", () => {
  it("활성 디바이스만 기본 조회하고 도메인 형태로 변환한다", async () => {
    const row = {
      id: "device-1",
      user_id: "user-1",
      platform: "ios",
      device_name: "Youngzin iPhone",
      is_active: true,
      last_seen_at: "2026-04-02T01:00:00.000Z",
      created_at: "2026-04-01T00:00:00.000Z",
      updated_at: "2026-04-02T01:00:00.000Z",
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

    const devices = await listDevices({
      client: { from } as never,
      userId: "user-1",
    });

    expect(from).toHaveBeenCalledWith("devices");
    expect(query.eq).toHaveBeenNthCalledWith(1, "user_id", "user-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "is_active", true);
    expect(query.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(query.limit).toHaveBeenCalledWith(50);
    expect(devices).toEqual([
      {
        id: "device-1",
        userId: "user-1",
        platform: "ios",
        deviceName: "Youngzin iPhone",
        isActive: true,
        lastSeenAt: "2026-04-02T01:00:00.000Z",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-02T01:00:00.000Z",
      },
    ]);
  });

  it("비활성 기기를 포함하면 최대 100개를 조회한다", async () => {
    const query = createAwaitableQuery(
      {
        data: [],
        error: null,
      },
      ["eq", "limit", "order"]
    );
    const from = jest.fn(() => ({
      select: jest.fn(() => query),
    }));

    await listDevices({
      client: { from } as never,
      includeInactive: true,
      userId: "user-1",
    });

    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.eq).not.toHaveBeenCalledWith("is_active", true);
    expect(query.limit).toHaveBeenCalledWith(100);
  });

  it("device id 기준으로 upsert 한다", async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        id: "device-1",
        user_id: "user-1",
        platform: "android",
        device_name: null,
        is_active: true,
        last_seen_at: "2026-04-02T02:00:00.000Z",
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-02T02:00:00.000Z",
      },
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ upsert }));

    const device = await upsertDevice(
      {
        id: "device-1",
        userId: "user-1",
        platform: "android",
        lastSeenAt: "2026-04-02T02:00:00.000Z",
        isActive: true,
      },
      { from } as never
    );

    expect(upsert).toHaveBeenCalledWith(
      {
        id: "device-1",
        user_id: "user-1",
        platform: "android",
        device_name: undefined,
        is_active: true,
        last_seen_at: "2026-04-02T02:00:00.000Z",
      },
      { onConflict: "id" }
    );
    expect(device.platform).toBe("android");
  });

  it("비활성화 시 user 범위를 함께 묶어 update 한다", async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        id: "device-1",
        user_id: "user-1",
        platform: "ios",
        device_name: "iPhone",
        is_active: false,
        last_seen_at: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-02T03:00:00.000Z",
      },
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const eqChain = {
      eq: jest.fn(),
      select,
    };
    eqChain.eq.mockReturnValue(eqChain);
    const update = jest.fn(() => ({ eq: eqChain.eq }));
    const from = jest.fn(() => ({ update }));

    const device = await deactivateDevice({
      client: { from } as never,
      id: "device-1",
      userId: "user-1",
    });

    expect(update).toHaveBeenCalledWith({ is_active: false });
    expect(eqChain.eq).toHaveBeenNthCalledWith(1, "id", "device-1");
    expect(eqChain.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
    expect(device.isActive).toBe(false);
  });
});
