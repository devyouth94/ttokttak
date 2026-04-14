import { Platform } from "react-native";
import * as Device from "expo-device";
import { getItemAsync, setItemAsync } from "expo-secure-store";

import type { DevicePlatform } from "~/features/recurring/domain/types";

const DEVICE_ID_STORAGE_KEY = "notification-device-id";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createUuidSegment(length: number): string {
  let result = "";

  while (result.length < length) {
    result += Math.floor(Math.random() * 16).toString(16);
  }

  return result.slice(0, length);
}

function createLocalDeviceId(): string {
  const generatedByPlatform = globalThis.crypto?.randomUUID?.();

  if (generatedByPlatform) {
    return generatedByPlatform;
  }

  return [
    createUuidSegment(8),
    createUuidSegment(4),
    `4${createUuidSegment(3)}`,
    `${["8", "9", "a", "b"][Math.floor(Math.random() * 4)]}${createUuidSegment(
      3
    )}`,
    createUuidSegment(12),
  ].join("-");
}

function isValidDeviceId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export async function getOrCreateNotificationDeviceId(): Promise<string> {
  const existingDeviceId = await getItemAsync(DEVICE_ID_STORAGE_KEY);

  if (existingDeviceId && isValidDeviceId(existingDeviceId)) {
    return existingDeviceId;
  }

  const nextDeviceId = createLocalDeviceId();

  await setItemAsync(DEVICE_ID_STORAGE_KEY, nextDeviceId);

  return nextDeviceId;
}

export function getCurrentDeviceName(): string | null {
  return Device.deviceName ?? null;
}

export function getCurrentDevicePlatform(): DevicePlatform {
  if (
    Platform.OS === "ios" ||
    Platform.OS === "android" ||
    Platform.OS === "web"
  ) {
    return Platform.OS;
  }

  return "unknown";
}
