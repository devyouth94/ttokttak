import { archiveSchedule } from "./archive-schedule-flow";

describe("archiveSchedule", () => {
  it("일정을 보관한 뒤 mutation 후처리를 실행한다", async () => {
    const archiveItem = jest.fn().mockResolvedValue(undefined);
    const completeMutation = jest.fn().mockResolvedValue(undefined);

    await archiveSchedule({
      archiveItem,
      completeMutation,
      itemId: "item-1",
      now: () => new Date("2026-05-20T00:00:00.000Z"),
      userId: "user-1",
    });

    expect(archiveItem).toHaveBeenCalledWith({
      id: "item-1",
      userId: "user-1",
    });
    expect(completeMutation).toHaveBeenCalledWith({
      effectiveFromUtc: "2026-05-20T00:00:00.000Z",
      itemId: "item-1",
      reason: "item-archived",
      userId: "user-1",
    });
  });
});
