import { completeRecurringItemMutationFlow } from "~/features/recurring/domain/recurring-item-mutation-flow";

const effectiveFromUtc = "2026-05-07T03:00:00.000Z";

describe("completeRecurringItemMutationFlow", () => {
  it("일정 변경 저장 후 해당 일정 범위의 알림을 동기화하고 recurring query를 무효화한다", async () => {
    const events: string[] = [];
    const syncAfterMutation = jest.fn(async () => {
      events.push("sync");
    });
    const invalidateRecurringUserQueries = jest.fn(async () => {
      events.push("invalidate");
    });

    await completeRecurringItemMutationFlow({
      effectiveFromUtc,
      invalidateRecurringUserQueries,
      itemId: "item-1",
      reason: "item-updated",
      syncAfterMutation,
      userId: "user-1",
    });

    expect(syncAfterMutation).toHaveBeenCalledWith({
      reason: "item-updated",
      scope: {
        effectiveFromUtc,
        itemId: "item-1",
        type: "item",
      },
    });
    expect(invalidateRecurringUserQueries).toHaveBeenCalledWith("user-1");
    expect(events).toEqual(["sync", "invalidate"]);
  });
});
