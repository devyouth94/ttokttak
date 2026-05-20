import { createRecurringItemFixture } from "~/entities/schedule/testing";
import { archiveSchedule } from "~/features/archive-schedule";
import { createSchedule } from "~/features/create-schedule";
import {
  createRecurringMutationPostprocessAdapter,
  recurringQueryKeys,
} from "~/features/recurring";
import { updateSchedule } from "~/features/update-schedule";

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

function createPostprocessAdapter(events: string[] = []) {
  const queryClient = {
    invalidateQueries: jest.fn(async () => {
      events.push("invalidate");
    }),
  };
  const syncAfterMutation = jest.fn(async () => {
    events.push("sync");
  });
  const captureException = jest.fn();
  const adapter = createRecurringMutationPostprocessAdapter({
    captureException,
    queryClient,
    syncAfterMutation,
  });

  return {
    adapter,
    captureException,
    queryClient,
    syncAfterMutation,
  };
}

describe("일정 변경 mutation 흐름", () => {
  it("일정 생성, 수정, 보관 뒤 알림을 먼저 재동기화하고 recurring query를 무효화한다", async () => {
    const mutationCases = [
      {
        expectedStorageInput: {
          ...draft,
          userId,
        },
        itemId: "created-item",
        reason: "item-created" as const,
        run: async (
          completeMutation: Parameters<
            typeof createSchedule
          >[0]["completeMutation"]
        ) => {
          const createItem = jest.fn(async () =>
            createRecurringItemFixture({ id: "created-item" })
          );

          await createSchedule({
            completeMutation,
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
        run: async (
          completeMutation: Parameters<
            typeof updateSchedule
          >[0]["completeMutation"]
        ) => {
          const updateItem = jest.fn(async () =>
            createRecurringItemFixture({ id: "updated-item" })
          );

          await updateSchedule({
            completeMutation,
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
        run: async (
          completeMutation: Parameters<
            typeof archiveSchedule
          >[0]["completeMutation"]
        ) => {
          const archiveItem = jest.fn(async () => undefined);

          await archiveSchedule({
            archiveItem,
            completeMutation,
            itemId: "archived-item",
            now,
            userId,
          });

          return archiveItem;
        },
      },
    ];

    for (const mutationCase of mutationCases) {
      const events: string[] = [];
      const { adapter, queryClient, syncAfterMutation } =
        createPostprocessAdapter(events);

      const storageMutation = await mutationCase.run(
        adapter.completeItemMutation
      );

      expect(storageMutation).toHaveBeenCalledWith(
        mutationCase.expectedStorageInput
      );
      expect(syncAfterMutation).toHaveBeenCalledWith({
        reason: mutationCase.reason,
        scope: { type: "all" },
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: recurringQueryKeys.user(userId),
      });
      expect(events).toEqual(["sync", "invalidate"]);
    }
  });

  it("일정 변경 후 알림 재동기화가 실패해도 기록하고 recurring query 무효화는 계속한다", async () => {
    const syncError = new Error("notification sync failed");
    const queryClient = {
      invalidateQueries: jest.fn(async () => undefined),
    };
    const syncAfterMutation = jest.fn(async () => {
      throw syncError;
    });
    const captureException = jest.fn();
    const adapter = createRecurringMutationPostprocessAdapter({
      captureException,
      queryClient,
      syncAfterMutation,
    });

    await expect(
      adapter.completeItemMutation({
        effectiveFromUtc: "2026-05-20T00:00:00.000Z",
        itemId: "item-1",
        reason: "item-updated",
        userId,
      })
    ).resolves.toBeUndefined();

    expect(captureException).toHaveBeenCalledWith(syncError, {
      tags: {
        feature: "recurring-mutation-notification-sync",
        reason: "item-updated",
      },
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: recurringQueryKeys.user(userId),
    });
  });
});
