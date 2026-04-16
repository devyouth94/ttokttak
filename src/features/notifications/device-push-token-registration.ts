import {
  getCurrentDeviceName,
  getCurrentDevicePlatform,
  getOrCreateNotificationDeviceId,
} from "~/features/notifications/device-identity";
import { getCurrentDevicePushToken } from "~/features/notifications/device-push-token";
import {
  deactivateDevicePushTokens,
  upsertDevicePushToken,
} from "~/features/recurring/repositories/device-push-tokens-repository";
import {
  deactivateDevice,
  upsertDevice,
} from "~/features/recurring/repositories/devices-repository";

function isPushCapablePlatform(
  platform: ReturnType<typeof getCurrentDevicePlatform>
): platform is "android" | "ios" {
  return platform === "android" || platform === "ios";
}

/**
 * 현재 기기 row를 최신 상태로 유지한다.
 */
async function ensureCurrentDevice(userId: string): Promise<{
  deviceId: string;
  platform: "android" | "ios";
}> {
  const deviceId = await getOrCreateNotificationDeviceId();
  const platform = getCurrentDevicePlatform();

  if (!isPushCapablePlatform(platform)) {
    throw new Error("현재 플랫폼은 원격 푸시 토큰 등록을 지원하지 않습니다.");
  }

  await upsertDevice({
    deviceName: getCurrentDeviceName(),
    id: deviceId,
    isActive: true,
    lastSeenAt: new Date().toISOString(),
    platform,
    userId,
  });

  return {
    deviceId,
    platform,
  };
}

/**
 * 현재 기기의 원격 푸시 토큰을 서버에 등록한다.
 */
export async function registerCurrentDevicePushToken(
  userId: string
): Promise<void> {
  const { deviceId, platform } = await ensureCurrentDevice(userId);
  const currentDevicePushToken = await getCurrentDevicePushToken();

  if (!currentDevicePushToken) {
    return;
  }

  await upsertDevicePushToken({
    deviceId,
    lastRegisteredAt: new Date().toISOString(),
    platform,
    pushProvider: currentDevicePushToken.pushProvider,
    pushToken: currentDevicePushToken.pushToken,
    userId,
  });
}

/**
 * 현재 기기의 원격 푸시 토큰을 비활성화한다.
 */
export async function deactivateCurrentDevicePushTokens(
  userId: string,
  reason: "logout" | "permission-denied"
): Promise<void> {
  const deviceId = await getOrCreateNotificationDeviceId();

  await deactivateDevicePushTokens({
    deviceId,
    reason,
    userId,
  });

  if (reason === "logout") {
    await deactivateDevice({
      id: deviceId,
      userId,
    });
  }
}
