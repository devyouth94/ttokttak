import { normalizeDevicePushToken } from "~/features/notifications/device-push-token";

describe("normalizeDevicePushToken", () => {
  it("iOS token을 APNs payload로 정규화한다", () => {
    expect(
      normalizeDevicePushToken({
        data: " apns-token ",
        type: "ios",
      })
    ).toEqual({
      platform: "ios",
      pushProvider: "apns",
      pushToken: "apns-token",
    });
  });

  it("빈 token은 무시한다", () => {
    expect(
      normalizeDevicePushToken({
        data: "   ",
        type: "android",
      })
    ).toBeNull();
  });
});
