import { createRecurringItemFixture } from "~/entities/schedule/testing";
import { archiveSchedule } from "~/features/archive-schedule";
import { createSchedule } from "~/features/create-schedule";
import { recurringQueryKeys } from "~/features/recurring";
import { syncLocalReminderNotifications } from "~/features/sync-local-notifications";
import { updateSchedule } from "~/features/update-schedule";
import { Sentry } from "~/shared/config/sentry";
import { queryClient } from "~/shared/lib/query/query-client";

jest.mock("~/features/sync-local-notifications", () => ({
  syncLocalReminderNotifications: jest.fn(),
}));

jest.mock("~/shared/config/sentry", () => ({
  Sentry: {
    captureException: jest.fn(),
  },
}));

const now = () => new Date("2026-05-20T00:00:00.000Z");
const userId = "user-1";

const draft = {
  anchorType: "fixed" as const,
  colorKey: "green" as const,
  description: null,
  endDateLocal: null,
  intervalValue: null,
  isArchived: false,
  notificationsEnabled: true,
  recurrenceType: "daily" as const,
  reminderTimeLocal: "09:00",
  startDateLocal: "2026-05-20",
  timezone: "Asia/Seoul",
  title: "물 마시기",
  weekdayMask: null,
};

describe("일정 변경 mutation 흐름", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.mocked(syncLocalReminderNotifications).mockReset();
    jest.mocked(Sentry.captureException).mockReset();
  });

  it("일정 생성, 수정, 보관 뒤 알림을 먼저 재동기화하고 recurring query를 무효화한다", async () => {
    const mutationCases = [
      {
        expectedStorageInput: {
          ...draft,
          userId,
        },
        itemId: "created-item",
        reason: "item-created" as const,
        run: async () => {
          const createItem = jest.fn(async () =>
            createRecurringItemFixture({ id: "created-item" })
          );

          await createSchedule({
            createItem,
            draft,
            now,
            userId,
          });

          return createItem;
        },
      },
      {
        expectedStorageInput: {
          id: "updated-item",
          patch: {
            title: "수정한 일정",
          },
          timezone: "Asia/Seoul",
          userId,
        },
        itemId: "updated-item",
        reason: "item-updated" as const,
        run: async () => {
          const updateItem = jest.fn(async () =>
            createRecurringItemFixture({ id: "updated-item" })
          );

          await updateSchedule({
            itemId: "updated-item",
            now,
            patch: {
              title: "수정한 일정",
            },
            timezone: "Asia/Seoul",
            updateItem,
            userId,
          });

          return updateItem;
        },
      },
      {
        expectedStorageInput: {
          id: "archived-item",
          userId,
        },
        itemId: "archived-item",
        reason: "item-archived" as const,
        run: async () => {
          const archiveItem = jest.fn(async () => undefined);

          await archiveSchedule({
            archiveItem,
            itemId: "archived-item",
            now,
            timezone: "Asia/Seoul",
            userId,
          });

          return archiveItem;
        },
      },
    ];

    for (const mutationCase of mutationCases) {
      const events: string[] = [];
      const invalidateQueries = jest
        .spyOn(queryClient, "invalidateQueries")
        .mockImplementation(async () => {
          events.push("invalidate");
        });
      jest
        .mocked(syncLocalReminderNotifications)
        .mockImplementation(async () => {
          events.push("sync");
          return {
            cancelledCount: 0,
            diagnostics: {
              candidateCount: 0,
              omittedDistantCount: 0,
              scheduledCount: 0,
            },
            scheduledCount: 0,
          };
        });

      const storageMutation = await mutationCase.run();

      expect(storageMutation).toHaveBeenCalledWith(
        mutationCase.expectedStorageInput
      );
      expect(syncLocalReminderNotifications).toHaveBeenCalledWith({
        reason: mutationCase.reason,
        scope: { type: "all" },
        timezone: "Asia/Seoul",
        userId,
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: recurringQueryKeys.user(userId),
      });
      expect(events).toEqual(["sync", "invalidate"]);
      invalidateQueries.mockRestore();
      jest.mocked(syncLocalReminderNotifications).mockReset();
    }
  });

  it("일정 변경 후 알림 재동기화가 실패해도 기록하고 recurring query 무효화는 계속한다", async () => {
    const syncError = new Error("notification sync failed");
    const invalidateQueries = jest
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    jest.mocked(syncLocalReminderNotifications).mockRejectedValue(syncError);
    const updatedItem = createRecurringItemFixture({ id: "updated-item" });
    const updateItem = jest.fn(async () => updatedItem);

    await expect(
      updateSchedule({
        itemId: "updated-item",
        now,
        patch: {
          title: "수정한 일정",
        },
        timezone: "Asia/Seoul",
        updateItem,
        userId,
      })
    ).resolves.toBe(updatedItem);

    expect(Sentry.captureException).toHaveBeenCalledWith(syncError, {
      tags: {
        feature: "recurring-mutation-notification-sync",
        reason: "item-updated",
      },
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: recurringQueryKeys.user(userId),
    });
  });
});
