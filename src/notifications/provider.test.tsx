import type { ReactElement } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { useAppLanguage } from "~/i18n/provider";

import { NotificationProvider } from "./provider";
import { cancelNotifications, syncNotifications } from "./sync";

declare const require: (moduleName: string) => unknown;

jest.mock("react-native", () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Linking: { openSettings: jest.fn() },
  Platform: { OS: "ios" },
}));
jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
}));
jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: "high" },
  DEFAULT_ACTION_IDENTIFIER: "default",
  PermissionStatus: { DENIED: "denied", GRANTED: "granted" },
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  clearLastNotificationResponseAsync: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));
jest.mock("~/sentry", () => ({ captureException: jest.fn() }));
jest.mock("~/i18n/provider", () => ({ useAppLanguage: jest.fn() }));
jest.mock("./sync", () => ({
  cancelNotifications: jest.fn(),
  notificationSyncStages: [
    "permission",
    "items",
    "logs",
    "candidates",
    "list-scheduled",
    "cancel",
    "schedule",
    "verify",
  ],
  NotificationSyncError: class NotificationSyncError extends Error {},
  syncNotifications: jest.fn(),
}));

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => {
    update: (element: ReactElement) => void;
  };
};
const AsyncStorage = require("@react-native-async-storage/async-storage") as {
  clear: () => Promise<void>;
  removeItem: jest.Mock;
  setItem: jest.Mock;
};

describe("NotificationProvider", () => {
  let language = "ko" as "ko" | "en";

  beforeEach(async () => {
    await AsyncStorage.clear();
    language = "ko";
    jest.clearAllMocks();
    jest
      .mocked(useAppLanguage)
      .mockImplementation(() => ({ language }) as never);
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      canAskAgain: true,
      granted: true,
      status: "granted",
    } as never);
    jest
      .mocked(Notifications.getLastNotificationResponseAsync)
      .mockResolvedValue(null);
    jest.mocked(syncNotifications).mockResolvedValue(null);
    jest.mocked(cancelNotifications).mockResolvedValue();
  });

  it("세션, 언어, foreground와 알림 tap에서 현재 알림을 다시 맞춘다", async () => {
    let renderer!: ReturnType<typeof TestRenderer.create>;

    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(notificationProvider("user-1"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(syncNotifications).toHaveBeenCalledWith({
      language: "ko",
      timezone: "Asia/Seoul",
      userId: "user-1",
    });

    language = "en";
    await TestRenderer.act(async () => {
      renderer.update(notificationProvider("user-1"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(syncNotifications).toHaveBeenCalledWith({
      language: "en",
      timezone: "Asia/Seoul",
      userId: "user-1",
    });

    const appStateListener = jest
      .mocked(AppState.addEventListener)
      .mock.calls.at(-1)?.[1];

    await TestRenderer.act(async () => {
      appStateListener?.("active");
      await Promise.resolve();
    });

    const responseListener = jest
      .mocked(Notifications.addNotificationResponseReceivedListener)
      .mock.calls.at(-1)?.[0];

    await TestRenderer.act(async () => {
      responseListener?.(reminderResponse());
      await Promise.resolve();
    });

    expect(router.replace).toHaveBeenCalledWith("/home");

    await TestRenderer.act(async () => {
      renderer.update(notificationProvider());
      await Promise.resolve();
    });

    expect(cancelNotifications).toHaveBeenCalledTimes(1);
    expect(syncNotifications).toHaveBeenCalledTimes(4);
  });

  it("최근 성공만 저장하고 로그아웃 때 진단 기록을 지운다", async () => {
    jest.mocked(syncNotifications).mockResolvedValue({
      candidateCount: 3,
      pendingCount: 2,
    });
    let renderer!: ReturnType<typeof TestRenderer.create>;

    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(notificationProvider("user-1"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "ttokttak:notification-diagnostics",
      expect.not.stringContaining("user-1")
    );

    await TestRenderer.act(async () => {
      renderer.update(notificationProvider());
      await Promise.resolve();
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "ttokttak:notification-diagnostics"
    );
  });

  it("이전 로그인 세대에서 늦게 끝난 동기화 결과를 저장하지 않는다", async () => {
    const result = deferred<{
      candidateCount: number;
      pendingCount: number;
    }>();
    jest.mocked(syncNotifications).mockReturnValueOnce(result.promise);
    let renderer!: ReturnType<typeof TestRenderer.create>;

    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(notificationProvider("user-1"));
      await Promise.resolve();
    });
    await TestRenderer.act(async () => {
      renderer.update(notificationProvider());
      await Promise.resolve();
    });
    await TestRenderer.act(async () => {
      result.resolve({
        candidateCount: 3,
        pendingCount: 2,
      });
      await result.promise;
    });

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it("진단 저장이 끝난 뒤 로그아웃 기록을 삭제한다", async () => {
    const stored = deferred<void>();
    jest.mocked(AsyncStorage.setItem).mockReturnValueOnce(stored.promise);
    jest.mocked(syncNotifications).mockResolvedValue({
      candidateCount: 3,
      pendingCount: 2,
    });
    let renderer!: ReturnType<typeof TestRenderer.create>;

    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(notificationProvider("user-1"));
      await Promise.resolve();
      await Promise.resolve();
    });
    await TestRenderer.act(async () => {
      renderer.update(notificationProvider());
      await Promise.resolve();
    });

    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();

    await TestRenderer.act(async () => {
      stored.resolve();
      await stored.promise;
      await Promise.resolve();
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "ttokttak:notification-diagnostics"
    );
  });
});

function notificationProvider(userId?: string): ReactElement {
  return (
    <NotificationProvider timezone="Asia/Seoul" userId={userId}>
      <></>
    </NotificationProvider>
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

function reminderResponse(): Notifications.NotificationResponse {
  return {
    actionIdentifier: "default",
    notification: {
      date: new Date("2026-04-23T09:00:00.000Z").getTime(),
      request: {
        content: {
          body: null,
          categoryIdentifier: null,
          data: {
            notificationKind: "reminder",
            source: "recurring-item",
          },
          sound: null,
          subtitle: null,
          title: null,
        },
        identifier: "notification-1",
        trigger: null,
      },
    },
  } as Notifications.NotificationResponse;
}
