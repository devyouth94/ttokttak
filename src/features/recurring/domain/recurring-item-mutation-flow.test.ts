import { processRecurringItemMutationFlow } from "~/features/recurring/domain/recurring-item-mutation-flow";
import type { RecurringItemDraft } from "~/features/recurring/domain/types";

const timezone = "Asia/Seoul";
const now = new Date("2026-05-07T03:00:00.000Z");

describe("processRecurringItemMutationFlow", () => {
  it("일정 생성은 저장 후 생성된 일정 범위의 알림을 동기화하고 recurring query를 무효화한다", async () => {
    const events: string[] = [];
    const createRecurringItem = jest.fn(async () => {
      events.push("create");

      return { id: "item-1" };
    });
    const syncAfterMutation = jest.fn(async () => {
      events.push("sync");
    });
    const invalidateRecurringUserQueries = jest.fn(async () => {
      events.push("invalidate");
    });

    const result = await processRecurringItemMutationFlow({
      createRecurringItem,
      invalidateRecurringUserQueries,
      mutation: {
        draft: createDraft(),
        type: "create",
        userId: "user-1",
      },
      now: () => now,
      syncAfterMutation,
    });

    expect(result).toEqual({ itemId: "item-1" });
    expect(createRecurringItem).toHaveBeenCalledWith({
      ...createDraft(),
      userId: "user-1",
    });
    expect(syncAfterMutation).toHaveBeenCalledWith({
      reason: "item-created",
      scope: {
        effectiveFromUtc: now.toISOString(),
        itemId: "item-1",
        type: "item",
      },
    });
    expect(invalidateRecurringUserQueries).toHaveBeenCalledWith("user-1");
    expect(events).toEqual(["create", "sync", "invalidate"]);
  });

  it("일정 수정은 저장 전 확정한 시각부터 해당 일정 알림을 다시 맞춘다", async () => {
    const events: string[] = [];
    const updateRecurringItem = jest.fn(async () => {
      events.push("update");
    });
    const syncAfterMutation = jest.fn(async () => {
      events.push("sync");
    });
    const invalidateRecurringUserQueries = jest.fn(async () => {
      events.push("invalidate");
    });
    const patch = {
      colorKey: "green" as const,
      notificationsEnabled: false,
      reminderTimeLocal: "10:30",
      title: "아침 물 마시기",
    };

    const result = await processRecurringItemMutationFlow({
      invalidateRecurringUserQueries,
      mutation: {
        itemId: "item-1",
        patch,
        timezone,
        type: "update",
        userId: "user-1",
      },
      now: () => now,
      syncAfterMutation,
      updateRecurringItem,
    });

    expect(result).toEqual({ itemId: "item-1" });
    expect(updateRecurringItem).toHaveBeenCalledWith({
      id: "item-1",
      patch,
      timezone,
      userId: "user-1",
    });
    expect(syncAfterMutation).toHaveBeenCalledWith({
      reason: "item-updated",
      scope: {
        effectiveFromUtc: now.toISOString(),
        itemId: "item-1",
        type: "item",
      },
    });
    expect(invalidateRecurringUserQueries).toHaveBeenCalledWith("user-1");
    expect(events).toEqual(["update", "sync", "invalidate"]);
  });

  it("일정 삭제는 보관 저장 후 해당 일정의 미래 알림을 다시 맞춘다", async () => {
    const events: string[] = [];
    const archiveRecurringItem = jest.fn(async () => {
      events.push("archive");
    });
    const syncAfterMutation = jest.fn(async () => {
      events.push("sync");
    });
    const invalidateRecurringUserQueries = jest.fn(async () => {
      events.push("invalidate");
    });

    const result = await processRecurringItemMutationFlow({
      archiveRecurringItem,
      invalidateRecurringUserQueries,
      mutation: {
        itemId: "item-1",
        type: "archive",
        userId: "user-1",
      },
      now: () => now,
      syncAfterMutation,
    });

    expect(result).toEqual({ itemId: "item-1" });
    expect(archiveRecurringItem).toHaveBeenCalledWith({
      id: "item-1",
      userId: "user-1",
    });
    expect(syncAfterMutation).toHaveBeenCalledWith({
      reason: "item-archived",
      scope: {
        effectiveFromUtc: now.toISOString(),
        itemId: "item-1",
        type: "item",
      },
    });
    expect(invalidateRecurringUserQueries).toHaveBeenCalledWith("user-1");
    expect(events).toEqual(["archive", "sync", "invalidate"]);
  });
});

function createDraft(
  overrides: Partial<RecurringItemDraft> = {}
): RecurringItemDraft {
  return {
    anchorType: "fixed",
    category: null,
    colorKey: "blue",
    description: "하루 8잔",
    intervalValue: null,
    isArchived: false,
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: "09:00",
    startDateLocal: "2026-05-07",
    timezone,
    title: "물 마시기",
    weekdayMask: null,
    ...overrides,
  };
}
