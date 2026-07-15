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
      language: "ko",
      timezone,
      userId: "user-1",
    });
    await lifecycle.syncAfterSessionRestored({
      language: "ko",
      timezone,
      userId: "user-1",
    });
    await lifecycle.syncAfterSessionRestored({
      language: "ko",
      timezone: "America/Los_Angeles",
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
      language: "ko",
      reason: "session-restored",
      scope: { type: "all" },
      timezone: "America/Los_Angeles",
      userId: "user-1",
    });
  });

  it("세션 복원 동기화가 실패하면 같은 세션에서 다시 시도한다", async () => {
    const cancelAllTtokttakLocalReminderNotifications = jest.fn(
      async () => undefined
    );
    const syncError = new Error("session sync failed");
    const captureException = jest.fn();
    const syncLocalReminderNotifications = jest
      .fn(async () => undefined)
      .mockRejectedValueOnce(syncError);
    const lifecycle = createLocalNotificationSyncLifecycle({
      cancelAllTtokttakLocalReminderNotifications,
      captureException,
      syncLocalReminderNotifications,
    });
    const context = {
      language: "ko" as const,
      timezone,
      userId: "user-1",
    };

    await lifecycle.syncAfterSessionRestored(context);
    await lifecycle.syncAfterSessionRestored(context);
    await lifecycle.syncAfterSessionRestored(context);

    expect(syncLocalReminderNotifications).toHaveBeenCalledTimes(2);
    expect(captureException).toHaveBeenCalledWith(syncError, {
      tags: {
        feature: "local-notification-session-sync",
      },
    });
  });

  it("세션 복원은 표시 언어만 바뀌어도 중복 전체 동기화하지 않는다", async () => {
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

    expect(syncLocalReminderNotifications).toHaveBeenCalledTimes(1);
    expect(syncLocalReminderNotifications).toHaveBeenCalledWith({
      language: "ko",
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
        language: "ko",
        timezone,
        userId: "user-1",
      })
    ).resolves.toBeUndefined();

    expect(syncLocalReminderNotifications).toHaveBeenCalledWith({
      language: "ko",
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

  it("표시 언어 변경 뒤 현재 언어로 전체 기기 로컬 알림을 재동기화한다", async () => {
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

  it("표시 언어 변경 전체 동기화 뒤 세션 복원 effect가 이어져도 중복 실행하지 않는다", async () => {
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
    await lifecycle.syncAfterSessionRestored({
      language: "en",
      timezone,
      userId: "user-1",
    });

    expect(syncLocalReminderNotifications).toHaveBeenCalledTimes(1);
    expect(syncLocalReminderNotifications).toHaveBeenCalledWith({
      language: "en",
      reason: "app-language-changed",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });
  });

  it("로그인 전처럼 user가 없으면 표시 언어 변경 알림 재동기화를 건너뛴다", async () => {
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

  it("표시 언어 변경 뒤 알림 재동기화 실패는 기록하고 사용자 흐름을 막지 않는다", async () => {
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
    ).resolves.toBeUndefined();

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
      language: "ko",
      timezone,
      userId: null,
    });
    await lifecycle.flushPendingNotificationTapSync({
      language: "ko",
      timezone,
      userId: "user-1",
    });
    await lifecycle.flushPendingNotificationTapSync({
      language: "ko",
      timezone,
      userId: "user-1",
    });

    expect(syncLocalReminderNotifications).toHaveBeenCalledTimes(1);
    expect(syncLocalReminderNotifications).toHaveBeenCalledWith({
      language: "ko",
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
      language: "ko",
      reason: "item-updated",
      scope,
      timezone,
      userId: null,
    });
    await lifecycle.syncAfterMutation({
      language: "ko",
      reason: "item-updated",
      scope,
      timezone,
      userId: "user-1",
    });

    await expect(
      lifecycle.syncAfterMutation({
        language: "ko",
        reason: "item-updated",
        scope,
        timezone,
        userId: "user-1",
      })
    ).rejects.toThrow(syncError);

    expect(syncLocalReminderNotifications).toHaveBeenCalledTimes(2);
    expect(syncLocalReminderNotifications).toHaveBeenNthCalledWith(1, {
      language: "ko",
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
      language: "ko",
      timezone,
      userId: "user-1",
    });
    await lifecycle.syncAfterSessionRestored({
      language: "ko",
      timezone,
      userId: null,
    });
    await lifecycle.syncAfterSessionRestored({
      language: "ko",
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
      language: "ko",
      timezone,
      userId: null,
    });
    await lifecycle.syncAfterSessionRestored({
      language: "ko",
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
      language: "ko",
      timezone,
      userId: "user-1",
    });
    await lifecycle.syncAfterSessionRestored({
      language: "ko",
      timezone,
      userId: "user-2",
    });

    expect(cancelAllTtokttakLocalReminderNotifications).toHaveBeenCalledTimes(
      1
    );
    expect(syncLocalReminderNotifications).toHaveBeenCalledTimes(2);
    expect(syncLocalReminderNotifications).toHaveBeenNthCalledWith(2, {
      language: "ko",
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
      language: "ko",
      timezone,
      userId: "user-1",
    });

    await expect(
      lifecycle.syncAfterSessionRestored({
        language: "ko",
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
