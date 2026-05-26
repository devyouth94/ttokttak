import { createLocalNotificationSyncLifecycle } from "~/features/sync-local-notifications/model/local-notification-sync-lifecycle";

const timezone = "Asia/Seoul";

describe("createLocalNotificationSyncLifecycle", () => {
  it("세션 복원은 사용자와 timezone 조합마다 현재 기기 로컬 알림을 한 번만 전체 재동기화한다", async () => {
    const cancelAllTtokttakLocalReminderNotifications = jest.fn(
      async () => undefined
    );
    const syncLocalReminderNotifications = jest.fn(async () => undefined);
    const lifecycle = createLocalNotificationSyncLifecycle({
      cancelAllTtokttakLocalReminderNotifications,
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

  it("세션 복원은 앱 표시 언어가 바뀌면 현재 언어로 다시 동기화한다", async () => {
    const cancelAllTtokttakLocalReminderNotifications = jest.fn(
      async () => undefined
    );
    const syncLocalReminderNotifications = jest.fn(async () => undefined);
    const lifecycle = createLocalNotificationSyncLifecycle({
      cancelAllTtokttakLocalReminderNotifications,
      captureException: jest.fn(),
      syncLocalReminderNotifications,
    });

    await lifecycle.syncAfterSessionRestored({
      language: "ko",
      timezone,
      userId: "user-1",
    });
    await lifecycle.syncAfterSessionRestored({
      language: "en",
      timezone,
      userId: "user-1",
    });

    expect(syncLocalReminderNotifications).toHaveBeenCalledTimes(2);
    expect(syncLocalReminderNotifications).toHaveBeenNthCalledWith(1, {
      language: "ko",
      reason: "session-restored",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });
    expect(syncLocalReminderNotifications).toHaveBeenNthCalledWith(2, {
      language: "en",
      reason: "session-restored",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });
  });

  it("앱 foreground 복귀 동기화 실패는 기록하고 사용자 흐름을 막지 않는다", async () => {
    const cancelAllTtokttakLocalReminderNotifications = jest.fn(
      async () => undefined
    );
    const syncError = new Error("sync failed");
    const captureException = jest.fn();
    const syncLocalReminderNotifications = jest.fn(async () => {
      throw syncError;
    });
    const lifecycle = createLocalNotificationSyncLifecycle({
      cancelAllTtokttakLocalReminderNotifications,
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

  it("앱 표시 언어 변경 뒤 현재 언어로 전체 기기 로컬 알림을 재동기화한다", async () => {
    const cancelAllTtokttakLocalReminderNotifications = jest.fn(
      async () => undefined
    );
    const syncLocalReminderNotifications = jest.fn(async () => undefined);
    const lifecycle = createLocalNotificationSyncLifecycle({
      cancelAllTtokttakLocalReminderNotifications,
      captureException: jest.fn(),
      syncLocalReminderNotifications,
    });

    await lifecycle.syncAfterAppLanguageChanged({
      language: "en",
      timezone,
      userId: "user-1",
    });

    expect(syncLocalReminderNotifications).toHaveBeenCalledWith({
      language: "en",
      reason: "app-language-changed",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });
  });

  it("로그인 전처럼 user가 없으면 앱 표시 언어 변경 알림 재동기화를 건너뛴다", async () => {
    const cancelAllTtokttakLocalReminderNotifications = jest.fn(
      async () => undefined
    );
    const syncLocalReminderNotifications = jest.fn(async () => undefined);
    const lifecycle = createLocalNotificationSyncLifecycle({
      cancelAllTtokttakLocalReminderNotifications,
      captureException: jest.fn(),
      syncLocalReminderNotifications,
    });

    await lifecycle.syncAfterAppLanguageChanged({
      language: "en",
      timezone,
      userId: null,
    });

    expect(syncLocalReminderNotifications).not.toHaveBeenCalled();
  });

  it("앱 표시 언어 변경 뒤 알림 재동기화 실패는 기록하고 caller에게 돌려준다", async () => {
    const cancelAllTtokttakLocalReminderNotifications = jest.fn(
      async () => undefined
    );
    const syncError = new Error("language sync failed");
    const captureException = jest.fn();
    const syncLocalReminderNotifications = jest.fn(async () => {
      throw syncError;
    });
    const lifecycle = createLocalNotificationSyncLifecycle({
      cancelAllTtokttakLocalReminderNotifications,
      captureException,
      syncLocalReminderNotifications,
    });

    await expect(
      lifecycle.syncAfterAppLanguageChanged({
        language: "en",
        timezone,
        userId: "user-1",
      })
    ).rejects.toThrow(syncError);

    expect(captureException).toHaveBeenCalledWith(syncError, {
      tags: {
        feature: "local-notification-language-sync",
      },
    });
  });

  it("알림 tap 뒤 user가 아직 없으면 동기화를 보류하고 user 준비 뒤 한 번만 실행한다", async () => {
    const cancelAllTtokttakLocalReminderNotifications = jest.fn(
      async () => undefined
    );
    const syncLocalReminderNotifications = jest.fn(async () => undefined);
    const lifecycle = createLocalNotificationSyncLifecycle({
      cancelAllTtokttakLocalReminderNotifications,
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
    const cancelAllTtokttakLocalReminderNotifications = jest.fn(
      async () => undefined
    );
    const syncError = new Error("mutation sync failed");
    const syncLocalReminderNotifications = jest
      .fn(async () => undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(syncError);
    const lifecycle = createLocalNotificationSyncLifecycle({
      cancelAllTtokttakLocalReminderNotifications,
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

  it("로그아웃처럼 세션이 없어지면 현재 기기의 Ttokttak 로컬 알림을 정리한다", async () => {
    const cancelAllTtokttakLocalReminderNotifications = jest.fn(
      async () => undefined
    );
    const syncLocalReminderNotifications = jest.fn(async () => undefined);
    const lifecycle = createLocalNotificationSyncLifecycle({
      cancelAllTtokttakLocalReminderNotifications,
      captureException: jest.fn(),
      syncLocalReminderNotifications,
    });

    await lifecycle.syncAfterSessionRestored({
      timezone,
      userId: "user-1",
    });
    await lifecycle.syncAfterSessionRestored({
      timezone,
      userId: null,
    });
    await lifecycle.syncAfterSessionRestored({
      timezone,
      userId: null,
    });

    expect(cancelAllTtokttakLocalReminderNotifications).toHaveBeenCalledTimes(
      1
    );
  });

  it("앱이 세션 없이 시작해도 현재 기기의 Ttokttak 로컬 알림을 정리한다", async () => {
    const cancelAllTtokttakLocalReminderNotifications = jest.fn(
      async () => undefined
    );
    const syncLocalReminderNotifications = jest.fn(async () => undefined);
    const lifecycle = createLocalNotificationSyncLifecycle({
      cancelAllTtokttakLocalReminderNotifications,
      captureException: jest.fn(),
      syncLocalReminderNotifications,
    });

    await lifecycle.syncAfterSessionRestored({
      timezone,
      userId: null,
    });
    await lifecycle.syncAfterSessionRestored({
      timezone,
      userId: null,
    });

    expect(cancelAllTtokttakLocalReminderNotifications).toHaveBeenCalledTimes(
      1
    );
    expect(syncLocalReminderNotifications).not.toHaveBeenCalled();
  });

  it("세션 사용자가 직접 바뀌면 기존 Ttokttak 로컬 알림을 정리한 뒤 새 사용자 알림을 동기화한다", async () => {
    const cancelAllTtokttakLocalReminderNotifications = jest.fn(
      async () => undefined
    );
    const syncLocalReminderNotifications = jest.fn(async () => undefined);
    const lifecycle = createLocalNotificationSyncLifecycle({
      cancelAllTtokttakLocalReminderNotifications,
      captureException: jest.fn(),
      syncLocalReminderNotifications,
    });

    await lifecycle.syncAfterSessionRestored({
      timezone,
      userId: "user-1",
    });
    await lifecycle.syncAfterSessionRestored({
      timezone,
      userId: "user-2",
    });

    expect(cancelAllTtokttakLocalReminderNotifications).toHaveBeenCalledTimes(
      1
    );
    expect(syncLocalReminderNotifications).toHaveBeenCalledTimes(2);
    expect(syncLocalReminderNotifications).toHaveBeenNthCalledWith(2, {
      reason: "session-restored",
      scope: { type: "all" },
      timezone,
      userId: "user-2",
    });
    expect(
      cancelAllTtokttakLocalReminderNotifications.mock.invocationCallOrder[0]
    ).toBeLessThan(
      syncLocalReminderNotifications.mock.invocationCallOrder[1] ?? 0
    );
  });

  it("세션 종료 알림 정리 실패는 기록하고 사용자 흐름을 막지 않는다", async () => {
    const cleanupError = new Error("cleanup failed");
    const cancelAllTtokttakLocalReminderNotifications = jest.fn(async () => {
      throw cleanupError;
    });
    const captureException = jest.fn();
    const lifecycle = createLocalNotificationSyncLifecycle({
      cancelAllTtokttakLocalReminderNotifications,
      captureException,
      syncLocalReminderNotifications: jest.fn(async () => undefined),
    });

    await lifecycle.syncAfterSessionRestored({
      timezone,
      userId: "user-1",
    });

    await expect(
      lifecycle.syncAfterSessionRestored({
        timezone,
        userId: null,
      })
    ).resolves.toBeUndefined();

    expect(captureException).toHaveBeenCalledWith(cleanupError, {
      tags: {
        feature: "local-notification-session-ended-cleanup",
      },
    });
  });
});
