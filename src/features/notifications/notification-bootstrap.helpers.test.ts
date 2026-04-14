import { resolveNotificationSyncReason } from "~/features/notifications/notification-bootstrap.helpers";

describe("resolveNotificationSyncReason", () => {
  it("앱 시작 시 최초 1회만 동기화를 허용한다", () => {
    expect(
      resolveNotificationSyncReason({
        authEvent: "BOOTSTRAP",
        hasAppStartSync: false,
        hasUser: true,
        lastSessionRestoreRevision: null,
        permissionStatus: "granted",
        sessionRevision: 1,
      })
    ).toBe("app-start");

    expect(
      resolveNotificationSyncReason({
        authEvent: "INITIAL_SESSION",
        hasAppStartSync: false,
        hasUser: true,
        lastSessionRestoreRevision: null,
        permissionStatus: "granted",
        sessionRevision: 1,
      })
    ).toBe("app-start");

    expect(
      resolveNotificationSyncReason({
        authEvent: "BOOTSTRAP",
        hasAppStartSync: true,
        hasUser: true,
        lastSessionRestoreRevision: null,
        permissionStatus: "granted",
        sessionRevision: 2,
      })
    ).toBeNull();
  });

  it("세션 복원 revision이 바뀔 때만 다시 동기화한다", () => {
    expect(
      resolveNotificationSyncReason({
        authEvent: "SIGNED_IN",
        hasAppStartSync: true,
        hasUser: true,
        lastSessionRestoreRevision: 2,
        permissionStatus: "granted",
        sessionRevision: 3,
      })
    ).toBe("session-restored");

    expect(
      resolveNotificationSyncReason({
        authEvent: "TOKEN_REFRESHED",
        hasAppStartSync: true,
        hasUser: true,
        lastSessionRestoreRevision: 3,
        permissionStatus: "granted",
        sessionRevision: 3,
      })
    ).toBeNull();
  });

  it("권한이 없거나 사용자가 없으면 동기화하지 않는다", () => {
    expect(
      resolveNotificationSyncReason({
        authEvent: "BOOTSTRAP",
        hasAppStartSync: false,
        hasUser: true,
        lastSessionRestoreRevision: null,
        permissionStatus: "denied",
        sessionRevision: 1,
      })
    ).toBeNull();

    expect(
      resolveNotificationSyncReason({
        authEvent: "SIGNED_IN",
        hasAppStartSync: false,
        hasUser: false,
        lastSessionRestoreRevision: null,
        permissionStatus: "granted",
        sessionRevision: 1,
      })
    ).toBeNull();
  });
});
