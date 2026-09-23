import type { ReactElement } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { useAppLanguage } from "~/i18n/provider";
import { captureException } from "~/sentry";
import { syncHomeWidget } from "~/widgets/home";

import { NotificationProvider, useNotifications } from "./provider";
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
jest.mock("~/widgets/home", () => ({ syncHomeWidget: jest.fn() }));
jest.mock("./sync", () => ({
  cancelNotifications: jest.fn(),
  syncNotifications: jest.fn(),
}));

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => {
    update: (element: ReactElement) => void;
    unmount: () => void;
  };
};
describe("NotificationProvider", () => {
  let language = "ko" as "ko" | "en";

  beforeEach(() => {
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
    jest.mocked(syncNotifications).mockResolvedValue();
    jest.mocked(cancelNotifications).mockResolvedValue();
    jest.mocked(syncHomeWidget).mockResolvedValue();
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
    expect(syncHomeWidget).toHaveBeenCalledWith({
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

    expect(cancelNotifications).toHaveBeenCalled();
    expect(syncNotifications).toHaveBeenCalledTimes(4);
    expect(syncHomeWidget).toHaveBeenLastCalledWith({
      language: "en",
      timezone: "Asia/Seoul",
      userId: undefined,
    });
  });

  it("권한 읽기 실패는 기존 상태를 유지하고 다음 foreground에서 재시도한다", async () => {
    let value!: ReturnType<typeof useNotifications>;
    function Probe() {
      value = useNotifications();
      return null;
    }
    const error = new Error("권한 읽기 실패");
    jest.mocked(Notifications.getPermissionsAsync).mockRejectedValueOnce(error);
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <NotificationProvider timezone="Asia/Seoul" userId="user-1">
          <Probe />
        </NotificationProvider>
      );
    });
    expect(value.isPermissionLoading).toBe(false);
    expect(value.permission.status).toBe("undetermined");
    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { feature: "notification-permission-refresh" },
    });
    const foreground = jest
      .mocked(AppState.addEventListener)
      .mock.calls.at(-1)![1];
    await TestRenderer.act(async () => {
      foreground("active");
    });
    expect(value.permission.status).toBe("granted");
    jest.mocked(Notifications.getPermissionsAsync).mockRejectedValueOnce(error);
    await TestRenderer.act(async () => {
      foreground("active");
    });
    expect(value.permission.status).toBe("granted");
    expect(value.isPermissionLoading).toBe(false);
    jest
      .mocked(Notifications.requestPermissionsAsync)
      .mockRejectedValueOnce(error);
    await TestRenderer.act(async () => {
      await expect(value.requestPermission()).rejects.toBe(error);
    });
    expect(value.isRequestingPermission).toBe(false);
    await TestRenderer.act(() => renderer.unmount());
  });

  it("A에서 B로 바뀌면 이전 callback을 막고 정리를 요청한 뒤 B를 동기화한다", async () => {
    let value!: ReturnType<typeof useNotifications>;
    function Probe() {
      value = useNotifications();
      return null;
    }
    const element = (userId: string) => (
      <NotificationProvider timezone="Asia/Seoul" userId={userId}>
        <Probe />
      </NotificationProvider>
    );
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(element("user-1"));
    });
    const oldSync = value.syncNotifications;
    jest.mocked(syncNotifications).mockClear();
    jest.mocked(syncHomeWidget).mockClear();
    await TestRenderer.act(async () => {
      renderer.update(element("user-2"));
    });
    expect(cancelNotifications).toHaveBeenCalledTimes(1);
    expect(
      jest.mocked(cancelNotifications).mock.invocationCallOrder[0]
    ).toBeLessThan(jest.mocked(syncNotifications).mock.invocationCallOrder[0]!);
    await TestRenderer.act(async () => {
      await oldSync();
    });
    expect(syncNotifications).toHaveBeenCalledTimes(1);
    expect(syncNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-2" })
    );
    expect(syncHomeWidget).toHaveBeenCalledTimes(1);
    await TestRenderer.act(() => renderer.unmount());
  });
});

function notificationProvider(userId?: string): ReactElement {
  return (
    <NotificationProvider timezone="Asia/Seoul" userId={userId}>
      <></>
    </NotificationProvider>
  );
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
