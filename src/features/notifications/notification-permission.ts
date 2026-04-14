import { Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";

export type NotificationPermissionStatus =
  | "unsupported"
  | "undetermined"
  | "granted"
  | "denied";

export type NotificationPermissionState = {
  canOpenSettings: boolean;
  canRequest: boolean;
  label: string;
  status: NotificationPermissionStatus;
};

function toNotificationPermissionState(
  permission: Pick<
    Notifications.NotificationPermissionsStatus,
    "canAskAgain" | "granted" | "status"
  >
): NotificationPermissionState {
  if (
    permission.granted ||
    permission.status === Notifications.PermissionStatus.GRANTED
  ) {
    return {
      canOpenSettings: false,
      canRequest: false,
      label: "허용됨",
      status: "granted",
    };
  }

  if (permission.status === Notifications.PermissionStatus.DENIED) {
    return {
      canOpenSettings: true,
      canRequest: false,
      label: "꺼짐",
      status: "denied",
    };
  }

  return {
    canOpenSettings: false,
    canRequest: permission.canAskAgain,
    label: "미정",
    status: "undetermined",
  };
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (Platform.OS === "web") {
    return {
      canOpenSettings: false,
      canRequest: false,
      label: "지원 안 됨",
      status: "unsupported",
    };
  }

  const permission = await Notifications.getPermissionsAsync();

  return toNotificationPermissionState(permission);
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (Platform.OS === "web") {
    return {
      canOpenSettings: false,
      canRequest: false,
      label: "지원 안 됨",
      status: "unsupported",
    };
  }

  const current = await getNotificationPermissionState();

  if (!current.canRequest) {
    return current;
  }

  const permission = await Notifications.requestPermissionsAsync();

  return toNotificationPermissionState(permission);
}

export async function openNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

export { toNotificationPermissionState };
