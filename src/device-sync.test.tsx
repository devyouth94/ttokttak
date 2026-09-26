import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import {
  clearDeviceOutputs,
  startDeviceSyncSession,
} from "~/device-sync-session";
import { useAppLanguage } from "~/i18n/provider";
import { captureException } from "~/sentry";

import { DeviceSyncProvider, useDeviceSync } from "./device-sync";

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
jest.mock("react-i18next", () => ({ useTranslation: jest.fn() }));
jest.mock("~/device-sync-session", () => ({
  clearDeviceOutputs: jest.fn(),
  startDeviceSyncSession: jest.fn(),
}));

const syncDeviceOutputs = jest.fn<
  Promise<void>,
  [{ language: string; timezone: string; userId: string }]
>();

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => {
    update: (element: ReactElement) => void;
    unmount: () => void;
  };
};
describe("DeviceSyncProvider", () => {
  let language = "ko" as "ko" | "en";

  beforeEach(() => {
    language = "ko";
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "ios",
    });
    jest
      .mocked(useAppLanguage)
      .mockImplementation(() => ({ language }) as never);
    jest
      .mocked(useTranslation)
      .mockReturnValue({ t: (key: string) => key } as never);
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      canAskAgain: true,
      granted: true,
      status: "granted",
    } as never);
    jest
      .mocked(Notifications.getLastNotificationResponseAsync)
      .mockResolvedValue(null);
    jest
      .mocked(Notifications.clearLastNotificationResponseAsync)
      .mockResolvedValue();
    jest
      .mocked(Notifications.setNotificationChannelAsync)
      .mockResolvedValue(null);
    jest.mocked(syncDeviceOutputs).mockResolvedValue();
    jest.mocked(clearDeviceOutputs).mockResolvedValue();
    jest.mocked(startDeviceSyncSession).mockImplementation((userId) => {
      let active = true;
      return {
        userId,
        get active() {
          return active;
        },
        refresh: (params) => syncDeviceOutputs({ ...params, userId }),
        close: async () => {
          active = false;
          await clearDeviceOutputs();
        },
      };
    });
  });

  it("세션, 언어, foreground와 알림 tap에서 현재 알림을 다시 맞춘다", async () => {
    let renderer!: ReturnType<typeof TestRenderer.create>;

    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(notificationProvider("user-1"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(syncDeviceOutputs).toHaveBeenCalledWith({
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

    expect(syncDeviceOutputs).toHaveBeenCalledWith({
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

    expect(clearDeviceOutputs).toHaveBeenCalled();
    expect(syncDeviceOutputs).toHaveBeenCalledTimes(4);
    expect(
      Notifications.addNotificationResponseReceivedListener
    ).toHaveBeenCalledTimes(1);
    expect(
      Notifications.getLastNotificationResponseAsync
    ).toHaveBeenCalledTimes(1);
    await TestRenderer.act(() => renderer.unmount());
  });

  it("권한 허용 즉시 갱신하고 갱신 실패를 권한 요청 실패로 바꾸지 않는다", async () => {
    let value!: ReturnType<typeof useDeviceSync>;
    function Probe() {
      value = useDeviceSync();
      return null;
    }
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <DeviceSyncProvider timezone="Asia/Seoul" userId="user-1">
          <Probe />
        </DeviceSyncProvider>
      );
    });
    jest.mocked(syncDeviceOutputs).mockClear();
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      granted: false,
      status: "denied",
      canAskAgain: false,
    } as never);
    await TestRenderer.act(async () => {
      await value.requestPermission();
    });
    expect(syncDeviceOutputs).not.toHaveBeenCalled();
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      granted: true,
      status: "granted",
      canAskAgain: true,
    } as never);
    const error = new Error("예약 실패");
    jest.mocked(syncDeviceOutputs).mockRejectedValueOnce(error);
    await TestRenderer.act(async () => {
      await expect(value.requestPermission()).resolves.toMatchObject({
        status: "granted",
      });
    });
    expect(syncDeviceOutputs).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { feature: "local-notification-permission-granted" },
    });
    expect(value.permission.status).toBe("granted");
    expect(value.isRequestingPermission).toBe(false);
    await TestRenderer.act(() => renderer.unmount());
  });

  it("늦은 시작 응답과 실시간 tap은 중복 처리하지 않고 최신 언어로 갱신한다", async () => {
    const last = deferred<Notifications.NotificationResponse | null>();
    jest
      .mocked(Notifications.getLastNotificationResponseAsync)
      .mockReturnValueOnce(last.promise);
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(notificationProvider("user-1"));
    });
    language = "en";
    await TestRenderer.act(async () => {
      renderer.update(notificationProvider("user-1"));
    });
    jest.mocked(syncDeviceOutputs).mockClear();
    await TestRenderer.act(async () => {
      jest
        .mocked(Notifications.addNotificationResponseReceivedListener)
        .mock.calls[0]![0](reminderResponse());
      last.resolve(reminderResponse());
    });
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(syncDeviceOutputs).toHaveBeenCalledTimes(1);
    expect(syncDeviceOutputs).toHaveBeenCalledWith(
      expect.objectContaining({ language: "en" })
    );
    await TestRenderer.act(() => renderer.unmount());
  });

  it("구독 종료 뒤 도착한 시작 응답은 화면 이동과 갱신을 하지 않는다", async () => {
    const last = deferred<Notifications.NotificationResponse | null>();
    jest
      .mocked(Notifications.getLastNotificationResponseAsync)
      .mockReturnValueOnce(last.promise);
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(notificationProvider("user-1"));
    });
    await TestRenderer.act(() => renderer.unmount());
    jest.mocked(syncDeviceOutputs).mockClear();
    await TestRenderer.act(async () => {
      last.resolve(reminderResponse());
    });
    expect(router.replace).not.toHaveBeenCalled();
    expect(syncDeviceOutputs).not.toHaveBeenCalled();
    expect(
      Notifications.clearLastNotificationResponseAsync
    ).not.toHaveBeenCalled();
  });

  it.each(["read", "clear"])("알림 응답 %s 실패는 기록한다", async (stage) => {
    const error = new Error("알림 응답 실패");
    if (stage === "read")
      jest
        .mocked(Notifications.getLastNotificationResponseAsync)
        .mockRejectedValueOnce(error);
    else
      jest
        .mocked(Notifications.clearLastNotificationResponseAsync)
        .mockRejectedValueOnce(error);
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(notificationProvider("user-1"));
    });
    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { feature: "local-notification-response" },
    });
    await TestRenderer.act(() => renderer.unmount());
  });

  it("권한 읽기 실패는 기존 상태를 유지하고 다음 foreground에서 재시도한다", async () => {
    let value!: ReturnType<typeof useDeviceSync>;
    function Probe() {
      value = useDeviceSync();
      return null;
    }
    const error = new Error("권한 읽기 실패");
    jest.mocked(Notifications.getPermissionsAsync).mockRejectedValueOnce(error);
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <DeviceSyncProvider timezone="Asia/Seoul" userId="user-1">
          <Probe />
        </DeviceSyncProvider>
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
    let value!: ReturnType<typeof useDeviceSync>;
    function Probe() {
      value = useDeviceSync();
      return null;
    }
    const element = (userId: string) => (
      <DeviceSyncProvider timezone="Asia/Seoul" userId={userId}>
        <Probe />
      </DeviceSyncProvider>
    );
    let renderer!: ReturnType<typeof TestRenderer.create>;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(element("user-1"));
    });
    const oldSync = value.syncDeviceOutputs;
    jest.mocked(syncDeviceOutputs).mockClear();
    await TestRenderer.act(async () => {
      renderer.update(element("user-2"));
    });
    expect(clearDeviceOutputs).toHaveBeenCalledTimes(1);
    expect(
      jest.mocked(clearDeviceOutputs).mock.invocationCallOrder[0]
    ).toBeLessThan(jest.mocked(syncDeviceOutputs).mock.invocationCallOrder[0]!);
    await TestRenderer.act(async () => {
      await oldSync();
    });
    expect(syncDeviceOutputs).toHaveBeenCalledTimes(1);
    expect(syncDeviceOutputs).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-2" })
    );
    await TestRenderer.act(() => renderer.unmount());
  });
});

function notificationProvider(userId?: string): ReactElement {
  return (
    <DeviceSyncProvider timezone="Asia/Seoul" userId={userId}>
      <></>
    </DeviceSyncProvider>
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}
