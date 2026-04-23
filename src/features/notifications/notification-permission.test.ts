import * as Notifications from "expo-notifications";

import { toNotificationPermissionState } from "~/features/notifications/notification-permission";

describe("toNotificationPermissionState", () => {
  it("허용 상태를 granted로 해석한다", () => {
    expect(
      toNotificationPermissionState({
        canAskAgain: false,
        granted: true,
        status: Notifications.PermissionStatus.GRANTED,
      })
    ).toEqual({
      canOpenSettings: false,
      canRequest: false,
      label: "허용됨",
      status: "granted",
    });
  });

  it("거부 상태를 denied로 해석한다", () => {
    expect(
      toNotificationPermissionState({
        canAskAgain: false,
        granted: false,
        status: Notifications.PermissionStatus.DENIED,
      })
    ).toEqual({
      canOpenSettings: true,
      canRequest: false,
      label: "꺼짐",
      status: "denied",
    });
  });

  it("거부 상태라도 다시 요청 가능하면 canRequest를 유지한다", () => {
    expect(
      toNotificationPermissionState({
        canAskAgain: true,
        granted: false,
        status: Notifications.PermissionStatus.DENIED,
      })
    ).toEqual({
      canOpenSettings: true,
      canRequest: true,
      label: "꺼짐",
      status: "denied",
    });
  });

  it("미정 상태를 undetermined로 해석한다", () => {
    expect(
      toNotificationPermissionState({
        canAskAgain: true,
        granted: false,
        status: Notifications.PermissionStatus.UNDETERMINED,
      })
    ).toEqual({
      canOpenSettings: false,
      canRequest: true,
      label: "미정",
      status: "undetermined",
    });
  });

  it("미정 상태에서 canAskAgain이 누락되어도 요청 가능하게 해석한다", () => {
    expect(
      toNotificationPermissionState({
        granted: false,
        status: Notifications.PermissionStatus.UNDETERMINED,
      } as Pick<
        Notifications.NotificationPermissionsStatus,
        "canAskAgain" | "granted" | "status"
      >)
    ).toEqual({
      canOpenSettings: false,
      canRequest: true,
      label: "미정",
      status: "undetermined",
    });
  });
});
