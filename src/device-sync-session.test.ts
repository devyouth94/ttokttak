import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { getPermission } from "~/notifications/permission";
import { listItems } from "~/schedule/db/items";
import { listLogs } from "~/schedule/db/logs";
import { captureException } from "~/sentry";
import { supabase } from "~/supabase";
import { applyHomeWidget } from "~/widgets/home";

import {
  clearDeviceOutputs,
  startDeviceSyncSession,
} from "./device-sync-session";

jest.mock("expo-notifications", () => ({
  AndroidNotificationPriority: { HIGH: "high" },
  SchedulableTriggerInputTypes: { DATE: "date" },
  cancelScheduledNotificationAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  getPresentedNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
}));
jest.mock("~/notifications/permission", () => ({ getPermission: jest.fn() }));
jest.mock("~/schedule/db/items", () => ({ listItems: jest.fn() }));
jest.mock("~/schedule/db/logs", () => ({ listLogs: jest.fn() }));
jest.mock("~/sentry", () => ({ captureException: jest.fn() }));
jest.mock("~/supabase", () => ({
  supabase: { auth: { getSession: jest.fn() } },
}));
jest.mock("~/widgets/home", () => ({ applyHomeWidget: jest.fn() }));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));

const params = {
  language: "ko" as const,
  timezone: "Asia/Seoul",
};

let authenticatedUserId = "A";

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = "ios";
  authenticatedUserId = "A";
  jest.mocked(getPermission).mockResolvedValue({
    canOpenSettings: false,
    canRequest: false,
    status: "granted",
  });
  jest.mocked(listItems).mockResolvedValue([]);
  jest.mocked(listLogs).mockResolvedValue([]);
  jest
    .mocked(supabase.auth.getSession)
    .mockImplementation(async () => sessionResult(authenticatedUserId));
  jest
    .mocked(Notifications.getAllScheduledNotificationsAsync)
    .mockResolvedValue([]);
  jest
    .mocked(Notifications.getPresentedNotificationsAsync)
    .mockResolvedValue([]);
  jest
    .mocked(Notifications.scheduleNotificationAsync)
    .mockResolvedValue("notification-id");
  jest.mocked(Notifications.setBadgeCountAsync).mockResolvedValue(true);
});

afterEach(async () => {
  jest
    .mocked(Notifications.getAllScheduledNotificationsAsync)
    .mockResolvedValue([]);
  jest
    .mocked(Notifications.getPresentedNotificationsAsync)
    .mockResolvedValue([]);
  jest.mocked(Notifications.setBadgeCountAsync).mockResolvedValue(true);
  jest.mocked(applyHomeWidget).mockImplementation(() => undefined);
  await clearDeviceOutputs();
});

it("A 조회를 기다리지 않고 정리하며 늦은 A 응답이 B 출력을 되살리지 않는다", async () => {
  const aItems = deferred<Awaited<ReturnType<typeof listItems>>>();
  const aReadStarted = deferred<void>();
  jest.mocked(listItems).mockImplementation(({ userId }) => {
    if (userId === "A") {
      aReadStarted.resolve();
      return aItems.promise;
    }

    return Promise.resolve([]);
  });
  const a = startDeviceSyncSession("A");
  const aRefresh = a.refresh(params);
  await aReadStarted.promise;

  await a.close();
  authenticatedUserId = "B";
  const b = startDeviceSyncSession("B");
  await b.refresh(params);
  expect(applyHomeWidget).toHaveBeenLastCalledWith(
    expect.objectContaining({ userId: "B" })
  );
  const writesAfterB = jest.mocked(applyHomeWidget).mock.calls.length;

  aItems.resolve([]);
  await aRefresh;

  expect(applyHomeWidget).toHaveBeenCalledTimes(writesAfterB);
  expect(
    jest
      .mocked(applyHomeWidget)
      .mock.calls.some(([input]) => input?.userId === "A")
  ).toBe(false);
});

it("시작한 A 쓰기와 정리를 마친 뒤 B를 쓰고 A의 재종료는 B를 지우지 않는다", async () => {
  const aWriteStarted = deferred<void>();
  const aWrite = deferred<boolean>();
  let firstWrite = true;
  jest.mocked(Notifications.setBadgeCountAsync).mockImplementation(async () => {
    if (!firstWrite) return true;
    firstWrite = false;
    aWriteStarted.resolve();
    return aWrite.promise;
  });
  const a = startDeviceSyncSession("A");
  const aRefresh = a.refresh(params);
  await aWriteStarted.promise;

  const cleanup = a.close();
  authenticatedUserId = "B";
  const b = startDeviceSyncSession("B");
  const bRefresh = b.refresh(params);

  aWrite.resolve(true);
  await Promise.all([aRefresh, cleanup, bRefresh]);
  expect(
    jest
      .mocked(applyHomeWidget)
      .mock.calls.map(([input]) => input?.userId ?? null)
  ).toEqual(["A", null, "B"]);

  const writesAfterB = jest.mocked(applyHomeWidget).mock.calls.length;
  await a.close();
  expect(applyHomeWidget).toHaveBeenCalledTimes(writesAfterB);
  expect(applyHomeWidget).toHaveBeenLastCalledWith(
    expect.objectContaining({ userId: "B" })
  );
});

it("공유 조회 실패는 기존 출력을 정리하지 않는다", async () => {
  jest.mocked(listItems).mockRejectedValueOnce(new Error("조회 실패"));
  const session = startDeviceSyncSession("A");

  await expect(session.refresh(params)).rejects.toMatchObject({
    stage: "items",
  });
  expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  expect(Notifications.dismissNotificationAsync).not.toHaveBeenCalled();
  expect(Notifications.setBadgeCountAsync).not.toHaveBeenCalled();
  expect(applyHomeWidget).not.toHaveBeenCalled();
});

it("알림 권한이 없는 iOS에서도 위젯을 갱신한다", async () => {
  jest.mocked(getPermission).mockResolvedValue({
    canOpenSettings: true,
    canRequest: false,
    status: "denied",
  });
  const session = startDeviceSyncSession("A");

  await session.refresh(params);

  expect(applyHomeWidget).toHaveBeenCalledWith(
    expect.objectContaining({ userId: "A" })
  );
  expect(
    Notifications.getAllScheduledNotificationsAsync
  ).not.toHaveBeenCalled();
});

it("알림 적용 실패가 위젯과 다음 refresh를 막지 않는다", async () => {
  jest
    .mocked(Notifications.getAllScheduledNotificationsAsync)
    .mockRejectedValueOnce(new Error("OS 실패"))
    .mockResolvedValue([]);
  const session = startDeviceSyncSession("A");

  await expect(session.refresh(params)).rejects.toMatchObject({
    stage: "list-scheduled",
  });
  expect(applyHomeWidget).toHaveBeenCalledTimes(1);
  await expect(session.refresh(params)).resolves.toBeUndefined();
  expect(applyHomeWidget).toHaveBeenCalledTimes(2);
});

it("위젯 실패가 알림과 다음 refresh를 막지 않는다", async () => {
  const error = new Error("위젯 실패");
  jest.mocked(applyHomeWidget).mockImplementationOnce(() => {
    throw error;
  });
  const session = startDeviceSyncSession("A");

  await expect(session.refresh(params)).resolves.toBeUndefined();
  expect(Notifications.setBadgeCountAsync).toHaveBeenCalled();
  expect(captureException).toHaveBeenCalledWith(error, {
    tags: { feature: "ios-home-widget-sync" },
  });
  await expect(session.refresh(params)).resolves.toBeUndefined();
  expect(applyHomeWidget).toHaveBeenCalledTimes(2);
});

function sessionResult(userId: string) {
  return {
    data: {
      session: {
        access_token: `${userId}-token`,
        user: { id: userId },
      },
    },
    error: null,
  } as never;
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((fulfill) => {
    resolve = fulfill;
  });

  return { promise, resolve };
}
