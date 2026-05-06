import { syncRemoteNotificationDeliveryJobs } from "~/features/notifications/notification-delivery-sync";
import type { RecurringItem } from "~/features/recurring/domain/types";
import { listCompletionLogs } from "~/features/recurring/repositories/completion-logs-repository";
import {
  cancelNotificationDeliveryJobs,
  listNotificationDeliveryJobs,
  upsertNotificationDeliveryJobs,
} from "~/features/recurring/repositories/notification-delivery-jobs-repository";
import { listRecurringItems } from "~/features/recurring/repositories/recurring-items-repository";

jest.mock(
  "~/features/recurring/repositories/completion-logs-repository",
  () => ({
    listCompletionLogs: jest.fn(),
  })
);

jest.mock(
  "~/features/recurring/repositories/notification-delivery-jobs-repository",
  () => ({
    cancelNotificationDeliveryJobs: jest.fn(),
    listNotificationDeliveryJobs: jest.fn(),
    upsertNotificationDeliveryJobs: jest.fn(),
  })
);

jest.mock(
  "~/features/recurring/repositories/recurring-items-repository",
  () => ({
    listRecurringItems: jest.fn(),
  })
);

const timezone = "Asia/Seoul";

describe("syncRemoteNotificationDeliveryJobs", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-21T00:00:00.000Z"));
    jest.clearAllMocks();
    jest.mocked(listCompletionLogs).mockResolvedValue([]);
    jest.mocked(listNotificationDeliveryJobs).mockResolvedValue([]);
    jest.mocked(upsertNotificationDeliveryJobs).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("설명이 없으면 원격 푸시 body를 비운다", async () => {
    jest.mocked(listRecurringItems).mockResolvedValue([
      createRecurringItem({
        description: null,
        id: "item-without-description",
        title: "약 먹기",
      }),
    ]);

    await syncRemoteNotificationDeliveryJobs({
      reason: "item-created",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });

    const jobs = jest.mocked(upsertNotificationDeliveryJobs).mock.calls[0]?.[0];

    expect(jobs).toBeDefined();
    expect(jobs?.every((job) => job.body === "")).toBe(true);
    expect(cancelNotificationDeliveryJobs).not.toHaveBeenCalled();
  });

  it("설명이 있으면 trim한 설명을 원격 푸시 body로 쓴다", async () => {
    jest.mocked(listRecurringItems).mockResolvedValue([
      createRecurringItem({
        description: "  식후에 먹기  ",
        id: "item-with-description",
        title: "약 먹기",
      }),
    ]);

    await syncRemoteNotificationDeliveryJobs({
      reason: "item-created",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });

    const jobs = jest.mocked(upsertNotificationDeliveryJobs).mock.calls[0]?.[0];

    expect(jobs).toBeDefined();
    expect(jobs?.every((job) => job.body === "식후에 먹기")).toBe(true);
  });

  it("복구할 수 없는 일정은 알림 예약 후보에서 제외한다", async () => {
    jest.mocked(listRecurringItems).mockResolvedValue([
      createRecurringItem({
        contentStatus: {
          reason: "decryption-failed",
          status: "unrecoverable",
        },
        id: "broken-item",
        title: "일정 내용을 복구할 수 없어요",
      }),
    ]);

    const result = await syncRemoteNotificationDeliveryJobs({
      reason: "item-created",
      scope: { type: "all" },
      timezone,
      userId: "user-1",
    });

    expect(result.scheduledCount).toBe(0);
    expect(upsertNotificationDeliveryJobs).not.toHaveBeenCalled();
  });
});

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
    startDateLocal: "2026-04-22",
    timezone,
    title,
    updatedAt: "2026-04-20T00:00:00.000Z",
    userId: "user-1",
    weekdayMask: null,
    ...rest,
  };
}
