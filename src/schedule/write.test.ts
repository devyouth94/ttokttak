import { captureException } from "~/sentry";

import * as db from "./db/items";
import { scheduleFixture } from "./fixtures";
import { refreshSchedules } from "./query";
import { archiveSchedule, createSchedule, updateSchedule } from "./write";

jest.mock("./db/items", () => ({
  archiveItem: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
}));
jest.mock("./query", () => ({ refreshSchedules: jest.fn() }));
jest.mock("~/sentry", () => ({ captureException: jest.fn() }));

const userId = "user-1";
const timezone = "Asia/Seoul";
const input = {
  anchorType: "fixed" as const,
  colorKey: "green" as const,
  description: null,
  endDateLocal: null,
  intervalValue: null,
  notificationsEnabled: true,
  recurrenceType: "daily" as const,
  reminderTimeLocal: "09:00",
  startDateLocal: "2026-05-20",
  title: "물 마시기",
  weekdayMask: null,
};

describe("일정 저장", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(db.archiveItem).mockResolvedValue(undefined);
    jest.mocked(db.createItem).mockResolvedValue(scheduleFixture());
    jest.mocked(db.updateItem).mockResolvedValue(scheduleFixture());
    jest.mocked(refreshSchedules).mockResolvedValue(undefined);
  });

  it("생성, 수정과 보관 뒤 알림과 화면 데이터를 새로 맞춘다", async () => {
    const syncNotifications = jest.fn(async () => undefined);

    await createSchedule({
      input,
      syncNotifications,
      timezone,
      userId,
    });
    await updateSchedule({
      itemId: "item-1",
      patch: { title: "수정한 일정" },
      syncNotifications,
      timezone,
      userId,
    });
    await archiveSchedule({ itemId: "item-1", syncNotifications });

    expect(db.createItem).toHaveBeenCalledWith({ ...input, timezone, userId });
    expect(db.updateItem).toHaveBeenCalledWith({
      id: "item-1",
      patch: { title: "수정한 일정" },
      timezone,
      userId,
    });
    expect(db.archiveItem).toHaveBeenCalledWith("item-1");
    expect(syncNotifications).toHaveBeenCalledTimes(3);
    expect(refreshSchedules).toHaveBeenCalledTimes(3);
  });

  it("알림 동기화 실패를 기록해도 화면 데이터는 새로 맞춘다", async () => {
    const error = new Error("알림 동기화 실패");

    await archiveSchedule({
      itemId: "item-1",
      syncNotifications: async () => {
        throw error;
      },
    });

    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { feature: "schedule-mutation-notification-sync" },
    });
    expect(refreshSchedules).toHaveBeenCalledTimes(1);
  });
});
