import { createSchedule } from "./create-schedule-flow";

describe("createSchedule", () => {
  it("일정을 생성한 뒤 mutation 후처리를 실행한다", async () => {
    const createItem = jest.fn().mockResolvedValue({ id: "item-1" });
    const completeMutation = jest.fn().mockResolvedValue(undefined);

    await createSchedule({
      completeMutation,
      createItem,
      draft: {
        anchorType: "fixed",
        colorKey: "green",
        description: null,
        endDateLocal: null,
        intervalValue: null,
        isArchived: false,
        notificationsEnabled: true,
        recurrenceType: "daily",
        reminderTimeLocal: "09:00",
        startDateLocal: "2026-05-20",
        timezone: "Asia/Seoul",
        title: "물 마시기",
        weekdayMask: null,
      },
      now: () => new Date("2026-05-20T00:00:00.000Z"),
      userId: "user-1",
    });

    expect(createItem).toHaveBeenCalledWith({
      anchorType: "fixed",
      colorKey: "green",
      description: null,
      endDateLocal: null,
      intervalValue: null,
      isArchived: false,
      notificationsEnabled: true,
      recurrenceType: "daily",
      reminderTimeLocal: "09:00",
      startDateLocal: "2026-05-20",
      timezone: "Asia/Seoul",
      title: "물 마시기",
      userId: "user-1",
      weekdayMask: null,
    });
    expect(completeMutation).toHaveBeenCalledWith({
      effectiveFromUtc: "2026-05-20T00:00:00.000Z",
      itemId: "item-1",
      reason: "item-created",
      userId: "user-1",
    });
  });
});
