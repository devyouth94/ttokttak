import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

export type PermissionStatus =
  | "unsupported"
  | "undetermined"
  | "granted"
  | "denied";

export type Permission = {
  canOpenSettings: boolean;
  canRequest: boolean;
  status: PermissionStatus;
};

/** Expo 권한 응답을 홈과 설정 화면에서 사용하는 상태로 바꾼다. */
function toPermission(
  permission: Notifications.NotificationPermissionsStatus
): Permission {
  if (permission.granted) {
    return {
      canOpenSettings: false,
      canRequest: false,
      status: "granted",
    };
  }

  if (permission.status === Notifications.PermissionStatus.DENIED) {
    return {
      canOpenSettings: true,
      canRequest: permission.canAskAgain,
      status: "denied",
    };
  }

  return {
    canOpenSettings: false,
    canRequest: permission.canAskAgain !== false,
    status: "undetermined",
  };
}

/** 현재 기기의 알림 권한을 읽는다. 웹은 지원하지 않는 상태로 처리한다. */
export async function getPermission(): Promise<Permission> {
  if (Platform.OS === "web") {
    return {
      canOpenSettings: false,
      canRequest: false,
      status: "unsupported",
    };
  }

  return toPermission(await Notifications.getPermissionsAsync());
}

/** 사용자에게 현재 기기의 알림 권한을 요청한다. */
export async function requestPermission(): Promise<Permission> {
  if (Platform.OS === "web") {
    return getPermission();
  }

  return toPermission(await Notifications.requestPermissionsAsync());
}
