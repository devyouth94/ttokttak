import { createLocalNotificationSyncLifecycle } from "~/features/notifications/notification-sync-lifecycle";

const timezone = "Asia/Seoul";

describe("createLocalNotificationSyncLifecycle", () => {
  it("세션 복원은 사용자와 timezone 조합마다 현재 기기 로컬 알림을 한 번만 전체 재동기화한다", async () => {
    const syncLocalReminderNotifications = jest.fn(async () => undefined);
    const lifecycle = createLocalNotificationSyncLifecycle({
      captureException: jest.fn(),
      syncLocalReminderNotifications,
    });

    await lifecycle.syncAfterSessionRestored({
      timezone,
      userId: "user-1",
    });
    await lifecycle.syncAfterSessionRestored({
      timezone,
      userId: "user-1",
    });
    await lifecycle.syncAfterSessionRestored({
      timezone: "America/Los_Angeles",
      userId: "user-1",
    });

    expect(syncLocalReminderNotifications).toHaveBeenCalledTimes(2);
    expect(syncLocalReminderNotifications).toHaveBeenNthCalledWith(1, {
      reason: "session-restored",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });
    expect(syncLocalReminderNotifications).toHaveBeenNthCalledWith(2, {
      reason: "session-restored",
      scope: { type: "all" },
      timezone: "America/Los_Angeles",
      userId: "user-1",
    });
  });

  it("앱 foreground 복귀 동기화 실패는 기록하고 사용자 흐름을 막지 않는다", async () => {
    const syncError = new Error("sync failed");
    const captureException = jest.fn();
    const syncLocalReminderNotifications = jest.fn(async () => {
      throw syncError;
    });
    const lifecycle = createLocalNotificationSyncLifecycle({
      captureException,
      syncLocalReminderNotifications,
    });

    await expect(
      lifecycle.syncAfterAppForegrounded({
        timezone,
        userId: "user-1",
      })
    ).resolves.toBeUndefined();

    expect(syncLocalReminderNotifications).toHaveBeenCalledWith({
      reason: "app-foregrounded",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });
    expect(captureException).toHaveBeenCalledWith(syncError, {
      tags: {
        feature: "local-notification-foreground-sync",
      },
    });
  });

  it("알림 tap 뒤 user가 아직 없으면 동기화를 보류하고 user 준비 뒤 한 번만 실행한다", async () => {
    const syncLocalReminderNotifications = jest.fn(async () => undefined);
    const lifecycle = createLocalNotificationSyncLifecycle({
      captureException: jest.fn(),
      syncLocalReminderNotifications,
    });

    await lifecycle.syncAfterNotificationTapped({
      timezone,
      userId: null,
    });
    await lifecycle.flushPendingNotificationTapSync({
      timezone,
      userId: "user-1",
    });
    await lifecycle.flushPendingNotificationTapSync({
      timezone,
      userId: "user-1",
    });

    expect(syncLocalReminderNotifications).toHaveBeenCalledTimes(1);
    expect(syncLocalReminderNotifications).toHaveBeenCalledWith({
      reason: "notification-tapped",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });
  });

  it("mutation 이후 동기화는 user가 있을 때 지정 scope로 실행하고 실패를 caller에게 돌려준다", async () => {
    const syncError = new Error("mutation sync failed");
    const syncLocalReminderNotifications = jest
      .fn(async () => undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(syncError);
    const lifecycle = createLocalNotificationSyncLifecycle({
      captureException: jest.fn(),
      syncLocalReminderNotifications,
    });
    const scope = {
      effectiveFromUtc: "2026-04-21T00:00:00.000Z",
      itemId: "item-1",
      type: "item" as const,
    };

    await lifecycle.syncAfterMutation({
      reason: "item-updated",
      scope,
      timezone,
      userId: null,
    });
    await lifecycle.syncAfterMutation({
      reason: "item-updated",
      scope,
      timezone,
      userId: "user-1",
    });

    await expect(
      lifecycle.syncAfterMutation({
        reason: "item-updated",
        scope,
        timezone,
        userId: "user-1",
      })
    ).rejects.toThrow(syncError);

    expect(syncLocalReminderNotifications).toHaveBeenCalledTimes(2);
    expect(syncLocalReminderNotifications).toHaveBeenNthCalledWith(1, {
      reason: "item-updated",
      scope,
      timezone,
      userId: "user-1",
    });
  });
});
