import { updateSchedule } from "./update-schedule-flow";

describe("updateSchedule", () => {
  it("일정을 수정한 뒤 mutation 후처리를 실행한다", async () => {
    const updateItem = jest.fn().mockResolvedValue({ id: "item-1" });
    const completeMutation = jest.fn().mockResolvedValue(undefined);

    await updateSchedule({
      completeMutation,
      itemId: "item-1",
      now: () => new Date("2026-05-20T00:00:00.000Z"),
      patch: {
        title: "수정한 일정",
      },
      timezone: "Asia/Seoul",
      updateItem,
      userId: "user-1",
    });

    expect(updateItem).toHaveBeenCalledWith({
      id: "item-1",
      patch: {
        title: "수정한 일정",
      },
      timezone: "Asia/Seoul",
      userId: "user-1",
    });
    expect(completeMutation).toHaveBeenCalledWith({
      effectiveFromUtc: "2026-05-20T00:00:00.000Z",
      itemId: "item-1",
      reason: "item-updated",
      userId: "user-1",
    });
  });
});
