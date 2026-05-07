import * as Notifications from "expo-notifications";

import {
  cancelAllTtokttakLocalReminderNotifications,
  createLocalReminderNotificationSyncPlan,
  syncLocalReminderNotifications,
} from "~/features/notifications/local-notification-sync";
import { getNotificationPermissionState } from "~/features/notifications/notification-permission";
import type {
  CompletionLog,
  RecurringItem,
} from "~/features/recurring/domain/types";
import { listCompletionLogs } from "~/features/recurring/repositories/completion-logs-repository";
import { listRecurringItems } from "~/features/recurring/repositories/recurring-items-repository";

jest.mock("expo-notifications", () => ({
  AndroidNotificationPriority: {
    HIGH: "high",
  },
  SchedulableTriggerInputTypes: {
    DATE: "date",
  },
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

jest.mock("~/features/notifications/notification-permission", () => ({
  getNotificationPermissionState: jest.fn(),
}));

jest.mock(
  "~/features/recurring/repositories/completion-logs-repository",
  () => ({
    listCompletionLogs: jest.fn(),
  })
);

jest.mock(
  "~/features/recurring/repositories/recurring-items-repository",
  () => ({
    listRecurringItems: jest.fn(),
  })
);

const timezone = "Asia/Seoul";

describe("syncLocalReminderNotifications", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-21T00:00:00.000Z"));
    jest.clearAllMocks();
    jest.mocked(getNotificationPermissionState).mockResolvedValue({
      canOpenSettings: false,
      canRequest: false,
      label: "허용됨",
      status: "granted",
    });
    jest.mocked(listCompletionLogs).mockResolvedValue([]);
    jest.mocked(listRecurringItems).mockResolvedValue([]);
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue([]);
    jest
      .mocked(Notifications.scheduleNotificationAsync)
      .mockResolvedValue("scheduled-1");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("복호화한 일정 제목과 예정 시각만 담아 현재 기기 로컬 알림을 예약한다", async () => {
    jest.mocked(listRecurringItems).mockResolvedValue([
      createRecurringItem({
        description: "이 설명은 알림에 들어가면 안 됩니다",
        id: "item-1",
        recurrenceType: "once",
        reminderTimeLocal: "21:00",
        title: "약 먹기",
      }),
    ]);

    const result = await syncLocalReminderNotifications({
      reason: "item-created",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });

    expect(result.scheduledCount).toBe(1);
    expect(result.diagnostics).toEqual({
      candidateCount: 1,
      omittedDistantCount: 0,
      scheduledCount: 1,
    });
    expect(JSON.stringify(result.diagnostics)).not.toContain("약 먹기");
    expect(JSON.stringify(result.diagnostics)).not.toContain(
      "이 설명은 알림에 들어가면 안 됩니다"
    );
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        body: "오후 9:00",
        data: {
          itemId: "item-1",
          notificationKind: "reminder",
          scheduledAtUtc: "2026-04-21T12:00:00.000Z",
          source: "recurring-item",
        },
        priority: "high",
        sound: "default",
        title: "약 먹기",
      },
      identifier: "ttokttak:reminder:user-1:item-1:2026-04-21T12:00:00.000Z",
      trigger: {
        channelId: "reminders",
        date: new Date("2026-04-21T12:00:00.000Z"),
        type: "date",
      },
    });
  });

  it("기본 30일 범위 안의 예정 알림을 예약한다", async () => {
    jest.mocked(listRecurringItems).mockResolvedValue([
      createRecurringItem({
        id: "item-1",
        reminderTimeLocal: "21:00",
        title: "약 먹기",
      }),
    ]);

    const result = await syncLocalReminderNotifications({
      reason: "item-updated",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });

    expect(result.scheduledCount).toBe(30);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(30);
  });

  it("30일 범위 밖이어도 반복 항목의 다음 occurrence 1개를 예약한다", async () => {
    jest.mocked(listRecurringItems).mockResolvedValue([
      createRecurringItem({
        id: "item-1",
        recurrenceType: "monthly",
        reminderTimeLocal: "09:00",
        startDateLocal: "2026-06-01",
        title: "월간 회고",
      }),
    ]);

    const result = await syncLocalReminderNotifications({
      reason: "item-updated",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });

    expect(result.scheduledCount).toBe(1);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "ttokttak:reminder:user-1:item-1:2026-06-01T00:00:00.000Z",
        trigger: expect.objectContaining({
          date: new Date("2026-06-01T00:00:00.000Z"),
        }),
      })
    );
  });

  it("pending 상한에 가까우면 예정 시각이 가까운 occurrence를 먼저 예약한다", async () => {
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue(
        Array.from({ length: 58 }, (_, index) =>
          createUnrelatedScheduledNotificationRequest(`other-${index}`)
        )
      );
    jest.mocked(listRecurringItems).mockResolvedValue([
      createRecurringItem({
        id: "far-item",
        recurrenceType: "monthly",
        reminderTimeLocal: "09:00",
        startDateLocal: "2026-06-01",
        title: "월간 회고",
      }),
      createRecurringItem({
        id: "near-item",
        reminderTimeLocal: "21:00",
        title: "약 먹기",
      }),
    ]);

    const result = await syncLocalReminderNotifications({
      reason: "item-updated",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });

    expect(result.scheduledCount).toBe(2);
    expect(result.diagnostics).toEqual({
      candidateCount: 31,
      omittedDistantCount: 29,
      scheduledCount: 2,
    });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        identifier:
          "ttokttak:reminder:user-1:near-item:2026-04-21T12:00:00.000Z",
      })
    );
    expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        identifier:
          "ttokttak:reminder:user-1:near-item:2026-04-22T12:00:00.000Z",
      })
    );
  });

  it("완료일 기준 반복은 미완료 occurrence가 있으면 다음 반복 알림을 자동 예약하지 않는다", async () => {
    jest.mocked(listRecurringItems).mockResolvedValue([
      createRecurringItem({
        anchorType: "completion_based",
        id: "item-1",
        reminderTimeLocal: "21:00",
        startDateLocal: "2026-04-20",
        title: "스트레칭",
      }),
    ]);

    const result = await syncLocalReminderNotifications({
      reason: "item-updated",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });

    expect(result.scheduledCount).toBe(0);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("완료일 기준 반복은 건너뜀 뒤 다음 occurrence 알림을 예약한다", async () => {
    jest.mocked(listCompletionLogs).mockResolvedValue([
      createCompletionLog({
        action: "skipped",
        itemId: "item-1",
        scheduledAtUtc: "2026-04-20T12:00:00.000Z",
      }),
    ]);
    jest.mocked(listRecurringItems).mockResolvedValue([
      createRecurringItem({
        anchorType: "completion_based",
        id: "item-1",
        reminderTimeLocal: "21:00",
        startDateLocal: "2026-04-20",
        title: "스트레칭",
      }),
    ]);

    const result = await syncLocalReminderNotifications({
      reason: "occurrence-skipped",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });

    expect(result.scheduledCount).toBe(30);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        identifier: "ttokttak:reminder:user-1:item-1:2026-04-21T12:00:00.000Z",
      })
    );
  });

  it("OS 알림 권한이 없으면 현재 기기 로컬 알림 예약을 시도하지 않는다", async () => {
    jest.mocked(getNotificationPermissionState).mockResolvedValue({
      canOpenSettings: true,
      canRequest: false,
      label: "꺼짐",
      status: "denied",
    });
    jest.mocked(listRecurringItems).mockResolvedValue([
      createRecurringItem({
        id: "item-1",
        recurrenceType: "once",
        title: "약 먹기",
      }),
    ]);

    const result = await syncLocalReminderNotifications({
      reason: "item-created",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });

    expect(result.scheduledCount).toBe(0);
    expect(
      Notifications.getAllScheduledNotificationsAsync
    ).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("item-level 알림이 꺼진 일정은 예약하지 않는다", async () => {
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue([
        createScheduledNotificationRequest({
          identifier:
            "ttokttak:reminder:user-1:disabled-item:2026-04-21T00:00:00.000Z",
          itemId: "disabled-item",
          scheduledAtUtc: "2026-04-21T00:00:00.000Z",
        }),
      ]);
    jest.mocked(listRecurringItems).mockResolvedValue([
      createRecurringItem({
        id: "disabled-item",
        notificationsEnabled: false,
        title: "운동하기",
      }),
    ]);

    const result = await syncLocalReminderNotifications({
      reason: "item-updated",
      scope: {
        effectiveFromUtc: "2026-04-21T00:00:00.000Z",
        itemId: "disabled-item",
        type: "item",
      },
      timezone,
      userId: "user-1",
    });

    expect(result.scheduledCount).toBe(0);
    expect(result.cancelledCount).toBe(1);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "ttokttak:reminder:user-1:disabled-item:2026-04-21T00:00:00.000Z"
    );
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("이미 같은 현재 기기 로컬 알림이 있으면 중복 예약하지 않는다", async () => {
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue([
        createScheduledNotificationRequest({
          identifier:
            "ttokttak:reminder:user-1:item-1:2026-04-21T00:00:00.000Z",
          itemId: "item-1",
          scheduledAtUtc: "2026-04-21T00:00:00.000Z",
        }),
      ]);
    jest.mocked(listRecurringItems).mockResolvedValue([
      createRecurringItem({
        id: "item-1",
        recurrenceType: "once",
        title: "약 먹기",
      }),
    ]);

    const result = await syncLocalReminderNotifications({
      reason: "item-created",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });

    expect(result.scheduledCount).toBe(0);
    expect(result.cancelledCount).toBe(0);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(
      Notifications.cancelScheduledNotificationAsync
    ).not.toHaveBeenCalled();
  });
});

describe("createLocalReminderNotificationSyncPlan", () => {
  it("scope 안에서 빠진 기존 알림은 취소하고 가까운 새 알림부터 예약한다", () => {
    const result = createLocalReminderNotificationSyncPlan({
      desiredNotifications: [
        createDesiredNotification({
          itemId: "item-1",
          scheduledAtUtc: "2026-04-21T12:00:00.000Z",
        }),
        createDesiredNotification({
          itemId: "item-1",
          scheduledAtUtc: "2026-04-22T12:00:00.000Z",
        }),
        createDesiredNotification({
          itemId: "item-2",
          scheduledAtUtc: "2026-04-21T13:00:00.000Z",
        }),
      ],
      existingNotifications: [
        createExistingNotification({
          itemId: "item-1",
          scheduledAtUtc: "2026-04-21T11:00:00.000Z",
        }),
        createExistingNotification({
          itemId: "item-1",
          scheduledAtUtc: "2026-04-20T12:00:00.000Z",
        }),
        createExistingNotification({
          itemId: "item-2",
          scheduledAtUtc: "2026-04-21T13:00:00.000Z",
        }),
      ],
      maxPendingLocalNotifications: 2,
      pendingNotificationCount: 2,
      scope: {
        effectiveFromUtc: "2026-04-21T00:00:00.000Z",
        itemId: "item-1",
        type: "item",
      },
    });

    expect(
      result.notificationsToCancel.map(
        (notification) => notification.identifier
      )
    ).toEqual(["ttokttak:reminder:user-1:item-1:2026-04-21T11:00:00.000Z"]);
    expect(
      result.notificationsToSchedule.map(
        (notification) => notification.identifier
      )
    ).toEqual(["ttokttak:reminder:user-1:item-1:2026-04-21T12:00:00.000Z"]);
    expect(result.diagnostics).toEqual({
      candidateCount: 2,
      omittedDistantCount: 1,
      scheduledCount: 1,
    });
  });
});

describe("cancelAllTtokttakLocalReminderNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("현재 기기에 예약된 Ttokttak reminder 알림만 전부 취소한다", async () => {
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue([
        createUnrelatedScheduledNotificationRequest("other-app"),
        createUnrelatedScheduledNotificationRequest("ttokttak:other:user-1"),
        createScheduledNotificationRequest({
          identifier:
            "ttokttak:reminder:user-1:item-1:2026-04-21T12:00:00.000Z",
          itemId: "item-1",
          scheduledAtUtc: "2026-04-21T12:00:00.000Z",
        }),
        createScheduledNotificationRequest({
          identifier:
            "ttokttak:reminder:user-2:item-2:2026-04-22T12:00:00.000Z",
          itemId: "item-2",
          scheduledAtUtc: "2026-04-22T12:00:00.000Z",
        }),
      ]);

    const result = await cancelAllTtokttakLocalReminderNotifications();

    expect(result).toEqual({ cancelledCount: 2 });
    expect(
      Notifications.cancelScheduledNotificationAsync
    ).toHaveBeenCalledTimes(2);
    expect(
      Notifications.cancelScheduledNotificationAsync
    ).toHaveBeenNthCalledWith(
      1,
      "ttokttak:reminder:user-1:item-1:2026-04-21T12:00:00.000Z"
    );
    expect(
      Notifications.cancelScheduledNotificationAsync
    ).toHaveBeenNthCalledWith(
      2,
      "ttokttak:reminder:user-2:item-2:2026-04-22T12:00:00.000Z"
    );
  });
});

function createScheduledNotificationRequest(params: {
  identifier: string;
  itemId: string;
  scheduledAtUtc: string;
}): Notifications.NotificationRequest {
  return {
    content: {
      body: null,
      categoryIdentifier: null,
      data: {
        itemId: params.itemId,
        notificationKind: "reminder",
        scheduledAtUtc: params.scheduledAtUtc,
        source: "recurring-item",
      },
      sound: null,
      subtitle: null,
      title: null,
    },
    identifier: params.identifier,
    trigger: null,
  };
}

function createExistingNotification(params: {
  itemId: string;
  scheduledAtUtc: string;
}) {
  return {
    identifier: `ttokttak:reminder:user-1:${params.itemId}:${params.scheduledAtUtc}`,
    itemId: params.itemId,
    scheduledAtUtc: params.scheduledAtUtc,
  };
}

function createDesiredNotification(params: {
  itemId: string;
  scheduledAtUtc: string;
}) {
  return {
    body: "오후 9:00",
    identifier: `ttokttak:reminder:user-1:${params.itemId}:${params.scheduledAtUtc}`,
    itemId: params.itemId,
    payload: {
      itemId: params.itemId,
      notificationKind: "reminder" as const,
      scheduledAtUtc: params.scheduledAtUtc,
      source: "recurring-item" as const,
    },
    scheduledAtUtc: params.scheduledAtUtc,
    title: "약 먹기",
  };
}

function createCompletionLog(
  overrides: Partial<CompletionLog> &
    Pick<CompletionLog, "itemId" | "scheduledAtUtc">
): CompletionLog {
  return {
    action: "completed",
    actedAtUtc: "2026-04-20T13:00:00.000Z",
    createdAt: "2026-04-20T13:00:00.000Z",
    deviceId: null,
    id: "log-1",
    userId: "user-1",
    ...overrides,
  };
}

function createUnrelatedScheduledNotificationRequest(
  identifier: string
): Notifications.NotificationRequest {
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

function createRecurringItem(
  overrides: Partial<RecurringItem> & Pick<RecurringItem, "id" | "title">
): RecurringItem {
  const { id, title, ...rest } = overrides;

  return {
    anchorType: "fixed",
    category: null,
    colorKey: "blue",
    createdAt: "2026-04-20T00:00:00.000Z",
    description: null,
    id,
    intervalValue: null,
    isArchived: false,
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: "09:00",
    startDateLocal: "2026-04-21",
    timezone,
    title,
    updatedAt: "2026-04-20T00:00:00.000Z",
    userId: "user-1",
    weekdayMask: null,
    ...rest,
  };
}
