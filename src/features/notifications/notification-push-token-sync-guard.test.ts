import type { CurrentDevicePushTokenRegistration } from "~/features/notifications/device-push-token-registration";
import {
  isSamePushTokenRegistration,
  shouldSkipListenerPushTokenRegistration,
} from "~/features/notifications/notification-push-token-sync-guard";

const baseRegistration = {
  deviceId: "device-1",
  permissionStatus: "granted",
  pushProvider: "apns",
  pushToken: "token-1",
  userId: "user-1",
} satisfies CurrentDevicePushTokenRegistration;

describe("notification push token sync guard", () => {
  it("같은 user/device/provider/token/권한 조합을 중복으로 판단한다", () => {
    expect(
      isSamePushTokenRegistration(baseRegistration, {
        ...baseRegistration,
      })
    ).toBe(true);
  });

  it("token 값이 바뀌면 새 등록 대상으로 판단한다", () => {
    expect(
      isSamePushTokenRegistration(baseRegistration, {
        ...baseRegistration,
        pushToken: "token-2",
      })
    ).toBe(false);
  });

  it("listener 반복이 마지막 성공 등록과 같으면 건너뛴다", () => {
    expect(
      shouldSkipListenerPushTokenRegistration({
        candidate: baseRegistration,
        inFlightRegistration: null,
        lastSuccessfulRegistration: {
          ...baseRegistration,
        },
      })
    ).toBe(true);
  });

  it("listener 반복이 진행 중인 등록과 같으면 건너뛴다", () => {
    expect(
      shouldSkipListenerPushTokenRegistration({
        candidate: baseRegistration,
        inFlightRegistration: {
          ...baseRegistration,
        },
        lastSuccessfulRegistration: null,
      })
    ).toBe(true);
  });

  it("사용자나 token이 다르면 listener 등록을 허용한다", () => {
    expect(
      shouldSkipListenerPushTokenRegistration({
        candidate: {
          ...baseRegistration,
          pushToken: "token-2",
        },
        inFlightRegistration: null,
        lastSuccessfulRegistration: {
          ...baseRegistration,
          userId: "user-2",
        },
      })
    ).toBe(false);
  });
});
