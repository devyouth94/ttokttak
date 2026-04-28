import {
  getCurrentDeviceName,
  getCurrentDevicePlatform,
  getOrCreateNotificationDeviceId,
} from "~/features/notifications/device-identity";
import { getCurrentDevicePushToken } from "~/features/notifications/device-push-token";
import { registerCurrentDevicePushToken } from "~/features/notifications/device-push-token-registration";
import { upsertDevicePushToken } from "~/features/recurring/repositories/device-push-tokens-repository";
import { upsertDevice } from "~/features/recurring/repositories/devices-repository";

jest.mock("~/features/notifications/device-identity", () => ({
  getCurrentDeviceName: jest.fn(),
  getCurrentDevicePlatform: jest.fn(),
  getOrCreateNotificationDeviceId: jest.fn(),
}));

jest.mock("~/features/notifications/device-push-token", () => ({
  getCurrentDevicePushToken: jest.fn(),
}));

jest.mock(
  "~/features/recurring/repositories/device-push-tokens-repository",
  () => ({
    upsertDevicePushToken: jest.fn(),
  })
);

jest.mock("~/features/recurring/repositories/devices-repository", () => ({
  upsertDevice: jest.fn(),
}));

describe("registerCurrentDevicePushToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getCurrentDeviceName).mockReturnValue("테스트 기기");
    jest.mocked(getCurrentDevicePlatform).mockReturnValue("ios");
    jest
      .mocked(getOrCreateNotificationDeviceId)
      .mockResolvedValue("device-from-storage");
  });

  it("listener가 전달한 token이 있으면 현재 token을 다시 요청하지 않는다", async () => {
    const result = await registerCurrentDevicePushToken({
      currentDevicePushToken: {
        platform: "ios",
        pushProvider: "apns",
        pushToken: "apns-token",
      },
      deviceId: "device-1",
      userId: "user-1",
    });

    expect(getOrCreateNotificationDeviceId).not.toHaveBeenCalled();
    expect(getCurrentDevicePushToken).not.toHaveBeenCalled();
    expect(upsertDevice).toHaveBeenCalledWith({
      deviceName: "테스트 기기",
      id: "device-1",
      isActive: true,
      lastSeenAt: expect.any(String),
      platform: "ios",
      userId: "user-1",
    });
    expect(upsertDevicePushToken).toHaveBeenCalledWith({
      deviceId: "device-1",
      lastRegisteredAt: expect.any(String),
      platform: "ios",
      pushProvider: "apns",
      pushToken: "apns-token",
      userId: "user-1",
    });
    expect(result).toEqual({
      deviceId: "device-1",
      permissionStatus: "granted",
      pushProvider: "apns",
      pushToken: "apns-token",
      userId: "user-1",
    });
  });

  it("session 등록은 현재 기기 id와 현재 token을 조회한다", async () => {
    jest.mocked(getCurrentDevicePlatform).mockReturnValue("android");
    jest.mocked(getCurrentDevicePushToken).mockResolvedValue({
      platform: "android",
      pushProvider: "fcm",
      pushToken: "fcm-token",
    });

    const result = await registerCurrentDevicePushToken({
      userId: "user-1",
    });

    expect(getOrCreateNotificationDeviceId).toHaveBeenCalledTimes(1);
    expect(getCurrentDevicePushToken).toHaveBeenCalledTimes(1);
    expect(upsertDevice).toHaveBeenCalledWith({
      deviceName: "테스트 기기",
      id: "device-from-storage",
      isActive: true,
      lastSeenAt: expect.any(String),
      platform: "android",
      userId: "user-1",
    });
    expect(upsertDevicePushToken).toHaveBeenCalledWith({
      deviceId: "device-from-storage",
      lastRegisteredAt: expect.any(String),
      platform: "android",
      pushProvider: "fcm",
      pushToken: "fcm-token",
      userId: "user-1",
    });
    expect(result).toEqual({
      deviceId: "device-from-storage",
      permissionStatus: "granted",
      pushProvider: "fcm",
      pushToken: "fcm-token",
      userId: "user-1",
    });
  });
});
