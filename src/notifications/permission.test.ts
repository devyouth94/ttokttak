import * as Notifications from "expo-notifications";

import { getPermission, requestPermission } from "./permission";

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
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

  it("다시 요청할 수 없는 거절 상태에서 설정 이동을 허용한다", async () => {
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
  });
});
