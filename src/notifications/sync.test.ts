import * as Notifications from "expo-notifications";

import { listItems } from "~/schedule/db/items";
import { listLogs } from "~/schedule/db/logs";
import { logFixture, scheduleFixture } from "~/schedule/fixtures";
import { captureException } from "~/sentry";
import { supabase } from "~/supabase";

import type { Candidate } from "./candidates";
import { getBadgeCounts, getCandidates } from "./candidates";
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
  dismissNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  getPresentedNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
}));
jest.mock("~/schedule/db/items", () => ({ listItems: jest.fn() }));
jest.mock("~/schedule/db/logs", () => ({ listLogs: jest.fn() }));
jest.mock("~/sentry", () => ({ captureException: jest.fn() }));
jest.mock("~/supabase", () => ({
  supabase: { auth: { getSession: jest.fn() } },
}));
jest.mock("./candidates", () => ({
  getBadgeCounts: jest.fn(),
  getCandidates: jest.fn(),
}));
jest.mock("./permission", () => ({ getPermission: jest.fn() }));

describe("알림 동기화", () => {
  beforeEach(() => {
    jest.resetAllMocks();
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
      .mocked(getBadgeCounts)
      .mockImplementation(
        ({ times }) => new Map(times.map((time) => [time.toISOString(), 3]))
      );
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

    await expect(syncNotifications(params)).resolves.toBeUndefined();

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

    await expect(syncNotifications(params)).resolves.toBeUndefined();

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(60);
    expect(getBadgeCounts).toHaveBeenCalledTimes(1);
    expect(jest.mocked(getBadgeCounts).mock.calls[0]?.[0].times).toHaveLength(
      61
    );
    expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(1, {
      content: {
        badge: 3,
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

  it("현재 뱃지를 맞추고 처리됐거나 비활성인 표시 알림을 제거한다", async () => {
    const item = scheduleFixture({ id: "item-1" });
    const handled = logFixture({
      itemId: item.id,
      scheduledAtUtc: "2026-04-21T00:00:00.000Z",
    });

    jest.mocked(listItems).mockResolvedValue([item]);
    jest.mocked(listLogs).mockResolvedValue([handled]);
    jest
      .mocked(Notifications.getPresentedNotificationsAsync)
      .mockResolvedValue([
        presented("other"),
        presented("ttokttak:reminder:user-1:item-1:2026-04-21T00:00:00.000Z"),
        presented("ttokttak:reminder:user-1:item-1:2026-04-22T00:00:00.000Z"),
        presented("ttokttak:reminder:user-1:archived:2026-04-21T00:00:00.000Z"),
        presented("ttokttak:reminder:user-2:item-2:2026-04-21T00:00:00.000Z"),
      ]);

    await syncNotifications(params);

    expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(3);
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledTimes(3);
    expect(Notifications.dismissNotificationAsync).not.toHaveBeenCalledWith(
      "ttokttak:reminder:user-1:item-1:2026-04-22T00:00:00.000Z"
    );
  });

  it("뱃지 갱신 실패가 알림 동기화를 막지 않는다", async () => {
    const error = new Error("뱃지 실패");

    jest.mocked(Notifications.setBadgeCountAsync).mockRejectedValue(error);

    await expect(syncNotifications(params)).resolves.toBeUndefined();
    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { feature: "app-icon-badge-sync" },
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

  it("동시에 요청해도 앞선 동기화가 끝난 뒤 다음 동기화를 시작한다", async () => {
    let markFirstStarted!: () => void;
    let releaseFirst!: (items: Awaited<ReturnType<typeof listItems>>) => void;
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });
    const firstItems = new Promise<Awaited<ReturnType<typeof listItems>>>(
      (resolve) => {
        releaseFirst = resolve;
      }
    );

    jest
      .mocked(listItems)
      .mockImplementationOnce(() => {
        markFirstStarted();
        return firstItems;
      })
      .mockResolvedValueOnce([]);

    const firstSync = syncNotifications(params);
    await firstStarted;
    const secondSync = syncNotifications(params);

    expect(getPermission).toHaveBeenCalledTimes(1);

    releaseFirst([]);
    await Promise.all([firstSync, secondSync]);

    expect(getPermission).toHaveBeenCalledTimes(2);
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

  it("실행 중 쌓인 요청은 최신 입력으로 합치고 후속 실행이 끝나야 완료한다", async () => {
    const firstStarted = deferred<void>();
    const secondStarted = deferred<void>();
    const firstItems = deferred<Awaited<ReturnType<typeof listItems>>>();
    const secondItems = deferred<Awaited<ReturnType<typeof listItems>>>();
    jest
      .mocked(listItems)
      .mockImplementationOnce(() => {
        firstStarted.resolve();
        return firstItems.promise;
      })
      .mockImplementationOnce(() => {
        secondStarted.resolve();
        return secondItems.promise;
      });
    const first = syncNotifications(params);
    await firstStarted.promise;
    const second = syncNotifications(params);
    const latest = syncNotifications({
      ...params,
      language: "en",
      timezone: "UTC",
    });
    let finished = false;
    void second.then(() => {
      finished = true;
    });
    expect(latest).toBe(second);
    firstItems.resolve([]);
    await first;
    await secondStarted.promise;
    expect(finished).toBe(false);
    secondItems.resolve([]);
    await Promise.all([second, latest]);
    expect(listItems).toHaveBeenCalledTimes(2);
    expect(getCandidates).toHaveBeenLastCalledWith(
      expect.objectContaining({
        language: "en",
        timezone: "UTC",
      })
    );
    expect(finished).toBe(true);
  });

  it("병합된 실행 실패는 모든 대기 호출에 전달하고 다음 실행은 허용한다", async () => {
    jest.mocked(listItems).mockRejectedValueOnce(new Error("조회 실패"));
    const first = syncNotifications(params);
    const second = syncNotifications(params);
    const results = await Promise.allSettled([first, second]);
    expect(results).toEqual([
      expect.objectContaining({ status: "rejected" }),
      expect.objectContaining({ status: "rejected" }),
    ]);
    expect(listItems).toHaveBeenCalledTimes(1);
    await expect(syncNotifications(params)).resolves.toBeUndefined();
  });

  it("같은 세션의 새 요청은 진행 중인 예약 적용을 중단하지 않는다", async () => {
    const started = deferred<void>();
    const scheduled = deferred<string>();
    const candidates = [
      candidate(1, new Date("2026-04-21T12:00:00.000Z")),
      candidate(2, new Date("2026-04-22T12:00:00.000Z")),
    ];
    jest.mocked(getCandidates).mockReturnValue(candidates);
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValueOnce([])
      .mockResolvedValue(candidates.map(candidateRequest));
    jest
      .mocked(Notifications.scheduleNotificationAsync)
      .mockImplementationOnce(() => {
        started.resolve();
        return scheduled.promise;
      });
    const first = syncNotifications(params);
    await started.promise;
    const second = syncNotifications(params);
    scheduled.resolve("first");
    await first;
    expect(
      jest.mocked(Notifications.scheduleNotificationAsync).mock.calls.length
    ).toBeGreaterThanOrEqual(2);
    expect(
      jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[1]?.[0]
        .identifier
    ).toBe(candidateRequest(candidates[1]!).identifier);
    await second;
  });

  it("조회 중 로그아웃 정리가 완료되면 늦은 조회로 이전 출력을 다시 쓰지 않는다", async () => {
    const started = deferred<void>();
    const items = deferred<Awaited<ReturnType<typeof listItems>>>();
    jest.mocked(listItems).mockImplementationOnce(() => {
      started.resolve();
      return items.promise;
    });
    const sync = syncNotifications(params);
    await started.promise;
    await cancelNotifications();
    jest.mocked(Notifications.setBadgeCountAsync).mockClear();
    items.resolve([]);
    await sync;
    expect(Notifications.setBadgeCountAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "예약 적용 중 세션 정리는 이전 쓰기를 기다리고 새 세션만 남긴다: B 전환=%s",
    async (switchUser) => {
      const started = deferred<void>();
      const scheduled = deferred<string>();
      const first = candidate(1, new Date("2026-04-21T12:00:00.000Z"));
      const second = candidate(2, new Date("2026-04-22T12:00:00.000Z"));
      const requests = [request("other")];
      jest.mocked(getCandidates).mockReturnValue([first, second]);
      jest
        .mocked(Notifications.getAllScheduledNotificationsAsync)
        .mockImplementation(async () => [...requests]);
      jest
        .mocked(Notifications.scheduleNotificationAsync)
        .mockImplementation(async (input) => {
          if (input.identifier!.includes("user-1:")) {
            started.resolve();
            await scheduled.promise;
          }
          requests.push(request(input.identifier!));
          return input.identifier!;
        });
      jest
        .mocked(Notifications.cancelScheduledNotificationAsync)
        .mockImplementation(async (id) => {
          const index = requests.findIndex((entry) => entry.identifier === id);
          if (index >= 0) requests.splice(index, 1);
        });
      const sync = syncNotifications(params);
      await started.promise;
      const cleanup = cancelNotifications();
      jest
        .mocked(supabase.auth.getSession)
        .mockResolvedValue(sessionResult("B-token", "user-2"));
      const nextSync = switchUser
        ? syncNotifications({ ...params, userId: "user-2" })
        : Promise.resolve();
      scheduled.resolve("first");
      await Promise.all([sync, cleanup, nextSync]);
      expect(requests.map(({ identifier }) => identifier)).toEqual(
        switchUser
          ? [
              "other",
              ...[first, second].map(
                (entry) =>
                  `ttokttak:reminder:user-2:${entry.itemId}:${entry.scheduledAtUtc}`
              ),
            ]
          : ["other"]
      );
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(
        switchUser ? 3 : 1
      );
      expect(Notifications.setBadgeCountAsync).toHaveBeenLastCalledWith(
        switchUser ? 3 : 0
      );
    }
  );

  it("A 조회가 지연돼도 B는 동기화하고 A의 늦은 응답은 무시한다", async () => {
    const started = deferred<void>();
    const items = deferred<Awaited<ReturnType<typeof listItems>>>();
    jest.mocked(listItems).mockImplementationOnce(() => {
      started.resolve();
      return items.promise;
    });
    const oldSync = syncNotifications(params);
    await started.promise;
    await cancelNotifications();
    jest
      .mocked(supabase.auth.getSession)
      .mockResolvedValue(sessionResult("B-token", "user-2"));
    await syncNotifications({ ...params, userId: "user-2" });
    const writes = jest.mocked(Notifications.setBadgeCountAsync).mock.calls
      .length;
    items.resolve([]);
    await oldSync;
    expect(Notifications.setBadgeCountAsync).toHaveBeenCalledTimes(writes);
    expect(listItems).toHaveBeenLastCalledWith({ userId: "user-2" });
  });

  it("예약 실패 한 번이 후속 동기화를 막지 않는다", async () => {
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockRejectedValueOnce(new Error("OS 조회 실패"));
    await expect(syncNotifications(params)).rejects.toMatchObject({
      stage: "list-scheduled",
    });
    await expect(syncNotifications(params)).resolves.toBeUndefined();
  });

  it.each(["badge", "presented"])(
    "%s 작업 중 로그아웃해도 정리 완료 뒤 배지와 표시 알림이 남지 않는다",
    async (stage) => {
      const started = deferred<void>();
      const pending = deferred<void>();
      let badge = 0;
      const visible = [
        presented("other"),
        presented("ttokttak:reminder:user-1:old"),
      ];
      jest
        .mocked(Notifications.setBadgeCountAsync)
        .mockImplementation(async (value) => {
          if (stage === "badge" && value !== 0) {
            started.resolve();
            await pending.promise;
          }
          badge = value;
          return true;
        });
      jest
        .mocked(Notifications.getPresentedNotificationsAsync)
        .mockImplementationOnce(async () => {
          if (stage === "presented") {
            started.resolve();
            await pending.promise;
          }
          return [...visible];
        })
        .mockImplementation(async () => [...visible]);
      jest
        .mocked(Notifications.dismissNotificationAsync)
        .mockImplementation(async (id) => {
          const index = visible.findIndex(
            ({ request }) => request.identifier === id
          );
          if (index >= 0) visible.splice(index, 1);
        });
      const sync = syncNotifications(params);
      await started.promise;
      const cleanup = cancelNotifications();
      pending.resolve();
      await Promise.all([sync, cleanup]);
      expect(badge).toBe(0);
      expect(visible.map(({ request }) => request.identifier)).toEqual([
        "other",
      ]);
    }
  );
});

describe("알림 정리", () => {
  it("모든 사용자의 똑딱 알림과 뱃지만 정리한다", async () => {
    jest.clearAllMocks();
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue([
        request("other"),
        request("ttokttak:reminder:user-1:item-1:2026-04-21T00:00:00.000Z"),
        request("ttokttak:reminder:user-2:item-2:2026-04-22T00:00:00.000Z"),
      ]);
    jest
      .mocked(Notifications.getPresentedNotificationsAsync)
      .mockResolvedValue([
        presented("other"),
        presented("ttokttak:reminder:user-1:item-1:2026-04-21T00:00:00.000Z"),
      ]);

    await cancelNotifications();

    expect(
      Notifications.cancelScheduledNotificationAsync
    ).toHaveBeenCalledTimes(2);
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
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

function presented(identifier: string): Notifications.Notification {
  return {
    date: 0,
    request: request(identifier),
  };
}

function sessionResult(accessToken: string, userId = "user-1") {
  return {
    data: {
      session: {
        access_token: accessToken,
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
