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

export type LocalNotificationRequest = Notifications.NotificationRequest;
export type LocalNotificationResponse = Notifications.NotificationResponse;
export type LocalNotificationSubscription = { remove: () => void };

export const defaultNotificationActionIdentifier =
  Notifications.DEFAULT_ACTION_IDENTIFIER;

export function configureDefaultLocalNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function toNotificationPermissionState(
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
      canRequest: permission.canAskAgain,
      label: "꺼짐",
      status: "denied",
    };
  }

  return {
    canOpenSettings: false,
    canRequest: permission.canAskAgain !== false,
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

export async function ensureAndroidLocalNotificationChannel(params: {
  channelId: string;
  name: string;
}): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(params.channelId, {
    enableVibrate: true,
    importance: Notifications.AndroidImportance.HIGH,
    name: params.name,
    showBadge: true,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function getAllScheduledLocalNotifications(): Promise<
  LocalNotificationRequest[]
> {
  return Notifications.getAllScheduledNotificationsAsync();
}

export async function scheduleDateLocalNotification(params: {
  body: string;
  channelId: string;
  data: Record<string, unknown>;
  identifier: string;
  scheduledAtUtc: string;
  title: string;
}): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      body: params.body,
      data: params.data,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      sound: "default",
      title: params.title,
    },
    identifier: params.identifier,
    trigger: {
      channelId: params.channelId,
      date: new Date(params.scheduledAtUtc),
      type: Notifications.SchedulableTriggerInputTypes.DATE,
    },
  });
}

export async function cancelScheduledLocalNotification(
  identifier: string
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function getLastLocalNotificationResponse(): Promise<LocalNotificationResponse | null> {
  return Notifications.getLastNotificationResponseAsync();
}

export async function clearLastLocalNotificationResponse(): Promise<void> {
  await Notifications.clearLastNotificationResponseAsync();
}

export function addLocalNotificationResponseReceivedListener(
  listener: (response: LocalNotificationResponse) => void
): LocalNotificationSubscription {
  return Notifications.addNotificationResponseReceivedListener(listener);
}
