import type { CurrentDevicePushTokenRegistration } from "~/features/notifications/device-push-token-registration";

type PushTokenRegistrationDuplicateCheck = {
  candidate: CurrentDevicePushTokenRegistration;
  inFlightRegistration: CurrentDevicePushTokenRegistration | null;
  lastSuccessfulRegistration: CurrentDevicePushTokenRegistration | null;
};

export function isSamePushTokenRegistration(
  left: CurrentDevicePushTokenRegistration | null,
  right: CurrentDevicePushTokenRegistration | null
): boolean {
  if (!left || !right) {
    return false;
  }

  return (
    left.userId === right.userId &&
    left.deviceId === right.deviceId &&
    left.pushProvider === right.pushProvider &&
    left.pushToken === right.pushToken &&
    left.permissionStatus === right.permissionStatus
  );
}

export function shouldSkipListenerPushTokenRegistration({
  candidate,
  inFlightRegistration,
  lastSuccessfulRegistration,
}: PushTokenRegistrationDuplicateCheck): boolean {
  return (
    isSamePushTokenRegistration(candidate, lastSuccessfulRegistration) ||
    isSamePushTokenRegistration(candidate, inFlightRegistration)
  );
}
