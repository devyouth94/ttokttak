import * as Notifications from "expo-notifications";

import { getPermission, requestPermission } from "./permission";

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("~/sentry", () => ({ captureException: jest.fn() }));
jest.mock("expo-notifications", () => ({
  PermissionStatus: { DENIED: "denied" },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

describe("알림 권한", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("허용된 기기 권한을 앱 상태로 바꾼다", async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      canAskAgain: true,
      granted: true,
      status: "granted",
    } as never);

    await expect(getPermission()).resolves.toEqual({
      canOpenSettings: false,
      canRequest: false,
      status: "granted",
    });
  });

  it("거절 후 재요청 가능 여부를 기기 응답대로 제공한다", async () => {
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      canAskAgain: false,
      granted: false,
      status: "denied",
    } as never);

    await expect(requestPermission()).resolves.toEqual({
      canOpenSettings: true,
      canRequest: false,
      status: "denied",
    });
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      canAskAgain: true,
      granted: false,
      status: "denied",
    } as never);
    await expect(requestPermission()).resolves.toEqual({
      canOpenSettings: true,
      canRequest: true,
      status: "denied",
    });
  });
});
