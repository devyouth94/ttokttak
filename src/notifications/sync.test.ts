import * as Notifications from "expo-notifications";

import {
  listCompletionLogs,
  listRecurringItems,
} from "~/entities/schedule/api";

import type { Candidate } from "./candidates";
import { getCandidates } from "./candidates";
import { getPermission } from "./permission";
import { cancelNotifications, syncNotifications } from "./sync";

jest.mock("expo-notifications", () => ({
  AndroidNotificationPriority: { HIGH: "high" },
  SchedulableTriggerInputTypes: { DATE: "date" },
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));
jest.mock("~/entities/schedule/api", () => ({
  listCompletionLogs: jest.fn(),
  listRecurringItems: jest.fn(),
}));
jest.mock("./candidates", () => ({ getCandidates: jest.fn() }));
jest.mock("./permission", () => ({ getPermission: jest.fn() }));

describe("알림 동기화", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getPermission).mockResolvedValue({
      canOpenSettings: false,
      canRequest: false,
      status: "granted",
    });
    jest.mocked(listCompletionLogs).mockResolvedValue([]);
    jest.mocked(listRecurringItems).mockResolvedValue([]);
    jest.mocked(getCandidates).mockReturnValue([]);
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue([]);
    jest
      .mocked(Notifications.scheduleNotificationAsync)
      .mockResolvedValue("notification-id");
  });

  it("권한이 없으면 일정과 예약 알림을 읽지 않는다", async () => {
    jest.mocked(getPermission).mockResolvedValue({
      canOpenSettings: true,
      canRequest: false,
      status: "denied",
    });

    await syncNotifications(params);

    expect(listRecurringItems).not.toHaveBeenCalled();
    expect(
      Notifications.getAllScheduledNotificationsAsync
    ).not.toHaveBeenCalled();
  });

  it("가까운 후보부터 최대 60개를 기기에 예약한다", async () => {
    jest
      .mocked(getCandidates)
      .mockReturnValue(
        Array.from({ length: 61 }, (_, index) =>
          candidate(index, new Date(Date.UTC(2026, 3, 21 + index, 12)))
        ).reverse()
      );

    await syncNotifications(params);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(60);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(1, {
      content: {
        body: "오후 9:00",
        data: {
          notificationKind: "reminder",
          source: "recurring-item",
        },
        priority: "high",
        sound: "default",
        title: "일정 0",
      },
      identifier: "ttokttak:reminder:user-1:item-0:2026-04-21T12:00:00.000Z",
      trigger: {
        channelId: "reminders",
        date: new Date("2026-04-21T12:00:00.000Z"),
        type: "date",
      },
    });
  });

  it("현재 후보에 없는 똑딱 알림만 취소한다", async () => {
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue([
        request("other"),
        request("ttokttak:reminder:user-2:item-1:2026-04-21T00:00:00.000Z"),
      ]);

    await syncNotifications(params);

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "ttokttak:reminder:user-2:item-1:2026-04-21T00:00:00.000Z"
    );
    expect(
      Notifications.cancelScheduledNotificationAsync
    ).toHaveBeenCalledTimes(1);
  });
});

describe("알림 정리", () => {
  it("모든 사용자의 똑딱 알림만 취소한다", async () => {
    jest.clearAllMocks();
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue([
        request("other"),
        request("ttokttak:reminder:user-1:item-1:2026-04-21T00:00:00.000Z"),
        request("ttokttak:reminder:user-2:item-2:2026-04-22T00:00:00.000Z"),
      ]);

    await cancelNotifications();

    expect(
      Notifications.cancelScheduledNotificationAsync
    ).toHaveBeenCalledTimes(2);
  });
});

const params = {
  language: "ko" as const,
  timezone: "Asia/Seoul",
  userId: "user-1",
};

function candidate(index: number, scheduledAt: Date): Candidate {
  return {
    body: "오후 9:00",
    itemId: `item-${index}`,
    scheduledAtUtc: scheduledAt.toISOString(),
    title: `일정 ${index}`,
  };
}

function request(identifier: string): Notifications.NotificationRequest {
  return {
    content: {
      body: null,
      categoryIdentifier: null,
      data: {},
      sound: null,
      subtitle: null,
      title: null,
    },
    identifier,
    trigger: null,
  };
}
