import * as Notifications from "expo-notifications";

import { listItems } from "~/schedule/db/items";
import { listLogs } from "~/schedule/db/logs";
import { supabase } from "~/supabase";

import type { Candidate } from "./candidates";
import { getCandidates } from "./candidates";
import { getPermission } from "./permission";
import {
  cancelNotifications,
  NotificationSyncError,
  syncNotifications,
} from "./sync";

jest.mock("expo-notifications", () => ({
  AndroidNotificationPriority: { HIGH: "high" },
  SchedulableTriggerInputTypes: { DATE: "date" },
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));
jest.mock("~/schedule/db/items", () => ({ listItems: jest.fn() }));
jest.mock("~/schedule/db/logs", () => ({ listLogs: jest.fn() }));
jest.mock("~/supabase", () => ({
  supabase: { auth: { getSession: jest.fn() } },
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
    jest.mocked(listLogs).mockResolvedValue([]);
    jest.mocked(listItems).mockResolvedValue([]);
    jest
      .mocked(supabase.auth.getSession)
      .mockResolvedValue(sessionResult("access-token"));
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

    expect(listItems).not.toHaveBeenCalled();
    expect(supabase.auth.getSession).not.toHaveBeenCalled();
    expect(
      Notifications.getAllScheduledNotificationsAsync
    ).not.toHaveBeenCalled();
  });

  it("데이터 조회 중 세션이 갱신되면 한 번만 다시 조회한다", async () => {
    jest
      .mocked(supabase.auth.getSession)
      .mockResolvedValueOnce(sessionResult("old-token"))
      .mockResolvedValueOnce(sessionResult("new-token"));
    jest
      .mocked(listItems)
      .mockRejectedValueOnce(new Error("401"))
      .mockResolvedValueOnce([]);

    await expect(syncNotifications(params)).resolves.toEqual({
      candidateCount: 0,
      pendingCount: 0,
    });

    expect(listItems).toHaveBeenCalledTimes(2);
  });

  it("세션이 그대로면 데이터 조회 오류를 재시도하지 않는다", async () => {
    jest.mocked(listItems).mockRejectedValue(new Error("401"));

    await expect(syncNotifications(params)).rejects.toMatchObject({
      errorCode: "operation-failed",
      stage: "items",
    } satisfies Partial<NotificationSyncError>);

    expect(listItems).toHaveBeenCalledTimes(1);
  });

  it("가까운 후보부터 최대 60개를 기기에 예약한다", async () => {
    const candidates = Array.from({ length: 61 }, (_, index) =>
      candidate(index, new Date(Date.UTC(2026, 3, 21 + index, 12)))
    ).reverse();
    const wanted = [...candidates]
      .sort((left, right) =>
        left.scheduledAtUtc.localeCompare(right.scheduledAtUtc)
      )
      .slice(0, 60);

    jest.mocked(getCandidates).mockReturnValue(candidates);
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(wanted.map(candidateRequest));

    await expect(syncNotifications(params)).resolves.toEqual({
      candidateCount: 61,
      pendingCount: 60,
    });

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
      .mockResolvedValueOnce([
        request("other"),
        request("ttokttak:reminder:user-2:item-1:2026-04-21T00:00:00.000Z"),
      ])
      .mockResolvedValueOnce([request("other")]);

    await syncNotifications(params);

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "ttokttak:reminder:user-2:item-1:2026-04-21T00:00:00.000Z"
    );
    expect(
      Notifications.cancelScheduledNotificationAsync
    ).toHaveBeenCalledTimes(1);
  });

  it("변경 뒤 실제 예약이 다르면 검증 단계 실패로 남긴다", async () => {
    jest
      .mocked(getCandidates)
      .mockReturnValue([candidate(1, new Date("2026-04-21T12:00:00.000Z"))]);
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(syncNotifications(params)).rejects.toMatchObject({
      errorCode: "verification-mismatch",
      stage: "verify",
    } satisfies Partial<NotificationSyncError>);
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

function request(
  identifier: string,
  content: { body?: string; title?: string } = {}
): Notifications.NotificationRequest {
  return {
    content: {
      body: content.body ?? null,
      categoryIdentifier: null,
      data: {},
      sound: null,
      subtitle: null,
      title: content.title ?? null,
    },
    identifier,
    trigger: null,
  };
}

function candidateRequest(value: Candidate): Notifications.NotificationRequest {
  return request(
    `ttokttak:reminder:user-1:${value.itemId}:${value.scheduledAtUtc}`,
    value
  );
}

function sessionResult(accessToken: string) {
  return {
    data: {
      session: {
        access_token: accessToken,
        user: { id: "user-1" },
      },
    },
    error: null,
  } as never;
}
