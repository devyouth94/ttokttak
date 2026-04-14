import { getItemAsync, setItemAsync } from "expo-secure-store";

import { getOrCreateNotificationDeviceId } from "~/features/notifications/device-identity";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

describe("getOrCreateNotificationDeviceId", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("기존 uuid가 있으면 그대로 사용한다", async () => {
    jest
      .mocked(getItemAsync)
      .mockResolvedValue("123e4567-e89b-42d3-a456-426614174000");

    const deviceId = await getOrCreateNotificationDeviceId();

    expect(deviceId).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(setItemAsync).not.toHaveBeenCalled();
  });

  it("기존 값이 uuid가 아니면 새 uuid로 교체 저장한다", async () => {
    jest.mocked(getItemAsync).mockResolvedValue("local-device-bad-id");

    const deviceId = await getOrCreateNotificationDeviceId();

    expect(deviceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(setItemAsync).toHaveBeenCalledWith(
      "notification-device-id",
      deviceId
    );
  });
});
