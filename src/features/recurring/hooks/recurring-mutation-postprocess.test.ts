import { createRecurringMutationPostprocessAdapter } from "~/features/recurring/hooks/recurring-mutation-postprocess";

const effectiveFromUtc = "2026-05-07T03:00:00.000Z";

describe("createRecurringMutationPostprocessAdapter", () => {
  it("일정 변경 후 전체 알림 순서 동기화와 recurring user query 무효화를 처리한다", async () => {
    const events: string[] = [];
    const queryClient = {
      invalidateQueries: jest.fn(async () => {
        events.push("invalidate");
      }),
    };
    const syncAfterMutation = jest.fn(async () => {
      events.push("sync");
    });
    const adapter = createRecurringMutationPostprocessAdapter({
      queryClient,
      syncAfterMutation,
    });

    await adapter.completeItemMutation({
      effectiveFromUtc,
      itemId: "item-1",
      reason: "item-updated",
      userId: "user-1",
    });

    expect(syncAfterMutation).toHaveBeenCalledWith({
      reason: "item-updated",
      scope: { type: "all" },
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["recurring", "user", "user-1"],
    });
    expect(events).toEqual(["sync", "invalidate"]);
  });

  it("알림 동기화 실패는 기록하고 recurring user query 무효화는 계속한다", async () => {
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
        effectiveFromUtc,
        itemId: "item-1",
        reason: "item-updated",
        userId: "user-1",
      })
    ).resolves.toBeUndefined();

    expect(captureException).toHaveBeenCalledWith(syncError, {
      tags: {
        feature: "recurring-mutation-notification-sync",
        reason: "item-updated",
      },
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["recurring", "user", "user-1"],
    });
  });
});
