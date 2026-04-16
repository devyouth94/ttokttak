import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import type {
  DevicePlatform,
  DevicePushToken,
  PushProvider,
} from "~/features/recurring/domain/types";

export type CurrentDevicePushToken = Pick<
  DevicePushToken,
  "platform" | "pushProvider" | "pushToken"
>;

function resolvePlatform(
  tokenType: Notifications.DevicePushToken["type"]
): Extract<DevicePlatform, "android" | "ios"> | null {
  if (tokenType === "ios" || tokenType === "android") {
    return tokenType;
  }

  if (Platform.OS === "ios" || Platform.OS === "android") {
    return Platform.OS;
  }

  return null;
}

function resolvePushProvider(
  platform: CurrentDevicePushToken["platform"]
): PushProvider {
  return platform === "ios" ? "apns" : "fcm";
}

export function normalizeDevicePushToken(
  devicePushToken: Notifications.DevicePushToken
): CurrentDevicePushToken | null {
  const platform = resolvePlatform(devicePushToken.type);
  const pushToken = devicePushToken.data.trim();

  if (!platform || pushToken.length === 0) {
    return null;
  }

  return {
    platform,
    pushProvider: resolvePushProvider(platform),
    pushToken,
  };
}

export async function getCurrentDevicePushToken(): Promise<CurrentDevicePushToken | null> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return null;
  }

  const devicePushToken = await Notifications.getDevicePushTokenAsync();

  return normalizeDevicePushToken(devicePushToken);
}

export function addCurrentDevicePushTokenListener(
  listener: (token: CurrentDevicePushToken) => Promise<void> | void
): ReturnType<typeof Notifications.addPushTokenListener> | null {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return null;
  }

  return Notifications.addPushTokenListener((devicePushToken) => {
    const normalizedPushToken = normalizeDevicePushToken(devicePushToken);

    if (!normalizedPushToken) {
      return;
    }

    void listener(normalizedPushToken);
  });
}
