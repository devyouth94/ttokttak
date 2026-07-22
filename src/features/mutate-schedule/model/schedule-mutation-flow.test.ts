import { createRecurringItemFixture } from "~/entities/schedule/testing";
import {
  archiveSchedule,
  createSchedule,
  updateSchedule,
} from "~/features/mutate-schedule";
import { captureException } from "~/sentry";
import { queryClient } from "~/shared/lib/query/query-client";

jest.mock("~/sentry", () => ({
  captureException: jest.fn(),
}));

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
    jest.mocked(captureException).mockReset();
  });

  it("일정 생성, 수정, 보관 뒤 알림을 맞추고 일정 조회를 무효화한다", async () => {
    const cases = [
      async (syncNotifications: () => Promise<void>) => {
        const createItem = jest.fn(async () =>
          createRecurringItemFixture({ id: "created-item" })
        );

        await createSchedule({ createItem, draft, syncNotifications, userId });

        expect(createItem).toHaveBeenCalledWith({ ...draft, userId });
      },
      async (syncNotifications: () => Promise<void>) => {
        const updateItem = jest.fn(async () =>
          createRecurringItemFixture({ id: "updated-item" })
        );

        await updateSchedule({
          itemId: "updated-item",
          patch: { title: "수정한 일정" },
          syncNotifications,
          timezone: "Asia/Seoul",
          updateItem,
          userId,
        });

        expect(updateItem).toHaveBeenCalledWith({
          id: "updated-item",
          patch: { title: "수정한 일정" },
          timezone: "Asia/Seoul",
          userId,
        });
      },
      async (syncNotifications: () => Promise<void>) => {
        const archiveItem = jest.fn(async () => undefined);

        await archiveSchedule({
          archiveItem,
          itemId: "archived-item",
          syncNotifications,
          userId,
        });

        expect(archiveItem).toHaveBeenCalledWith({
          id: "archived-item",
          userId,
        });
      },
    ];

    for (const run of cases) {
      const events: string[] = [];
      const syncNotifications = jest.fn(async () => {
        events.push("sync");
      });
      const invalidateQueries = jest
        .spyOn(queryClient, "invalidateQueries")
        .mockImplementation(async () => {
          events.push("invalidate");
        });

      await run(syncNotifications);

      expect(syncNotifications).toHaveBeenCalledTimes(1);
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["schedule-read", "user", userId],
      });
      expect(events).toEqual(["sync", "invalidate"]);
      invalidateQueries.mockRestore();
    }
  });

  it("알림 동기화 실패를 기록하고 일정 조회 무효화는 계속한다", async () => {
    const error = new Error("notification sync failed");
    const invalidateQueries = jest
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const updatedItem = createRecurringItemFixture({ id: "updated-item" });

    await expect(
      updateSchedule({
        itemId: "updated-item",
        patch: { title: "수정한 일정" },
        syncNotifications: jest.fn(async () => {
          throw error;
        }),
        timezone: "Asia/Seoul",
        updateItem: jest.fn(async () => updatedItem),
        userId,
      })
    ).resolves.toBe(updatedItem);

    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { feature: "schedule-mutation-notification-sync" },
    });
    expect(invalidateQueries).toHaveBeenCalled();
  });
});
