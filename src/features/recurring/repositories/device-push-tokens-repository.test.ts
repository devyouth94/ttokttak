import {
  deactivateDevicePushTokens,
  upsertDevicePushToken,
} from "~/features/recurring/repositories/device-push-tokens-repository";

describe("device push tokens repository", () => {
  it("device와 provider 기준으로 push token을 upsert 한다", async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        created_at: "2026-04-16T00:00:00.000Z",
        deactivated_at: null,
        deactivation_reason: null,
        device_id: "device-1",
        id: "token-1",
        is_active: true,
        last_registered_at: "2026-04-16T01:00:00.000Z",
        permission_status: "granted",
        platform: "ios",
        push_provider: "apns",
        push_token: "apns-token",
        updated_at: "2026-04-16T01:00:00.000Z",
        user_id: "user-1",
      },
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ upsert }));

    const token = await upsertDevicePushToken(
      {
        deviceId: "device-1",
        lastRegisteredAt: "2026-04-16T01:00:00.000Z",
        platform: "ios",
        pushProvider: "apns",
        pushToken: "apns-token",
        userId: "user-1",
      },
      { from } as never
    );

    expect(upsert).toHaveBeenCalledWith(
      {
        deactivated_at: null,
        deactivation_reason: null,
        device_id: "device-1",
        is_active: true,
        last_registered_at: "2026-04-16T01:00:00.000Z",
        permission_status: "granted",
        platform: "ios",
        push_provider: "apns",
        push_token: "apns-token",
        user_id: "user-1",
      },
      { onConflict: "device_id,push_provider" }
    );
    expect(token.pushProvider).toBe("apns");
  });

  it("권한 거부 시 현재 기기의 활성 token만 비활성화한다", async () => {
    const eqChain = {
      eq: jest.fn(),
      select: jest.fn().mockResolvedValue({
        data: [
          {
            created_at: "2026-04-16T00:00:00.000Z",
            deactivated_at: "2026-04-16T02:00:00.000Z",
            deactivation_reason: "permission-denied",
            device_id: "device-1",
            id: "token-1",
            is_active: false,
            last_registered_at: "2026-04-16T01:00:00.000Z",
            permission_status: "denied",
            platform: "android",
            push_provider: "fcm",
            push_token: "fcm-token",
            updated_at: "2026-04-16T02:00:00.000Z",
            user_id: "user-1",
          },
        ],
        error: null,
      }),
    };
    eqChain.eq.mockReturnValue(eqChain);
    const update = jest.fn(() => ({ eq: eqChain.eq }));
    const from = jest.fn(() => ({ update }));

    const tokens = await deactivateDevicePushTokens({
      client: { from } as never,
      deviceId: "device-1",
      reason: "permission-denied",
      userId: "user-1",
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        deactivation_reason: "permission-denied",
        is_active: false,
        permission_status: "denied",
      })
    );
    expect(eqChain.eq).toHaveBeenNthCalledWith(1, "device_id", "device-1");
    expect(eqChain.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
    expect(eqChain.eq).toHaveBeenNthCalledWith(3, "is_active", true);
    expect(tokens[0]?.isActive).toBe(false);
  });
});
