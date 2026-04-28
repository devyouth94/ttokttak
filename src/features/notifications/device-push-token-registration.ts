import {
  getCurrentDeviceName,
  getCurrentDevicePlatform,
  getOrCreateNotificationDeviceId,
} from "~/features/notifications/device-identity";
import {
  type CurrentDevicePushToken,
  getCurrentDevicePushToken,
} from "~/features/notifications/device-push-token";
import {
  deactivateDevicePushTokens,
  upsertDevicePushToken,
} from "~/features/recurring/repositories/device-push-tokens-repository";
import {
  deactivateDevice,
  upsertDevice,
} from "~/features/recurring/repositories/devices-repository";

export type CurrentDevicePushTokenRegistration = {
  deviceId: string;
  permissionStatus: "granted";
  pushProvider: CurrentDevicePushToken["pushProvider"];
  pushToken: string;
  userId: string;
};

type RegisterCurrentDevicePushTokenInput = {
  currentDevicePushToken?: CurrentDevicePushToken | null;
  deviceId?: string;
  userId: string;
};

function isPushCapablePlatform(
  platform: ReturnType<typeof getCurrentDevicePlatform>
): platform is "android" | "ios" {
  return platform === "android" || platform === "ios";
}

/**
 * 현재 기기 row를 최신 상태로 유지한다.
 */
async function ensureCurrentDevice({
  deviceId,
  userId,
}: {
  deviceId?: string;
  userId: string;
}): Promise<{
  deviceId: string;
  platform: "android" | "ios";
}> {
  const resolvedDeviceId =
    deviceId ?? (await getOrCreateNotificationDeviceId());
  const platform = getCurrentDevicePlatform();

  if (!isPushCapablePlatform(platform)) {
    throw new Error("현재 플랫폼은 원격 푸시 토큰 등록을 지원하지 않습니다.");
  }

  await upsertDevice({
    deviceName: getCurrentDeviceName(),
    id: resolvedDeviceId,
    isActive: true,
    lastSeenAt: new Date().toISOString(),
    platform,
    userId,
  });

  return {
    deviceId: resolvedDeviceId,
    platform,
  };
}

export function createCurrentDevicePushTokenRegistration({
  currentDevicePushToken,
  deviceId,
  userId,
}: {
  currentDevicePushToken: CurrentDevicePushToken;
  deviceId: string;
  userId: string;
}): CurrentDevicePushTokenRegistration {
  return {
    deviceId,
    permissionStatus: "granted",
    pushProvider: currentDevicePushToken.pushProvider,
    pushToken: currentDevicePushToken.pushToken,
    userId,
  };
}

/**
 * 현재 기기의 원격 푸시 토큰을 서버에 등록한다.
 */
export async function registerCurrentDevicePushToken({
  currentDevicePushToken,
  deviceId,
  userId,
}: RegisterCurrentDevicePushTokenInput): Promise<CurrentDevicePushTokenRegistration | null> {
  const { deviceId: resolvedDeviceId, platform } = await ensureCurrentDevice({
    deviceId,
    userId,
  });
  const resolvedDevicePushToken =
    currentDevicePushToken === undefined
      ? await getCurrentDevicePushToken()
      : currentDevicePushToken;

  if (!resolvedDevicePushToken) {
    return null;
  }

  await upsertDevicePushToken({
    deviceId: resolvedDeviceId,
    lastRegisteredAt: new Date().toISOString(),
    platform,
    pushProvider: resolvedDevicePushToken.pushProvider,
    pushToken: resolvedDevicePushToken.pushToken,
    userId,
  });

  return createCurrentDevicePushTokenRegistration({
    currentDevicePushToken: resolvedDevicePushToken,
    deviceId: resolvedDeviceId,
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
