import { captureException } from "~/sentry";

import * as db from "./db/items";
import { listItemLogs } from "./db/logs";
import { scheduleFixture } from "./fixtures";
import { refreshSchedules } from "./query";
import { archiveSchedule, createSchedule, updateSchedule } from "./write";

jest.mock("./db/items", () => ({
  archiveItem: jest.fn(),
  createItem: jest.fn(),
  getItem: jest.fn(),
  updateItem: jest.fn(),
}));
jest.mock("./db/logs", () => ({ listItemLogs: jest.fn() }));
jest.mock("./query", () => ({ refreshSchedules: jest.fn() }));
jest.mock("~/sentry", () => ({ captureException: jest.fn() }));

const userId = "user-1";
const timezone = "Asia/Seoul";
const input = {
  anchorType: "fixed" as const,
  colorHex: "#9FD4A5",
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
    jest.mocked(db.createItem).mockResolvedValue(undefined);
    jest.mocked(db.getItem).mockResolvedValue(scheduleFixture());
    jest.mocked(db.updateItem).mockResolvedValue(undefined);
    jest.mocked(listItemLogs).mockResolvedValue([]);
    jest.mocked(refreshSchedules).mockResolvedValue(undefined);
  });

  it("생성, 수정과 보관 뒤 알림과 화면 데이터를 새로 맞춘다", async () => {
    const syncDeviceOutputs = jest.fn(async () => undefined);

    await createSchedule({
      input,
      syncDeviceOutputs,
      timezone,
      userId,
    });
    await updateSchedule({
      itemId: "item-1",
      patch: { title: "수정한 일정" },
      syncDeviceOutputs,
      timezone,
      userId,
    });
    await archiveSchedule({ itemId: "item-1", syncDeviceOutputs });

    expect(db.createItem).toHaveBeenCalledWith({ ...input, timezone, userId });
    expect(db.updateItem).toHaveBeenCalledWith({
      edit: {
        item: {
          colorHex: "#9DB7F5",
          description: null,
          title: "수정한 일정",
        },
        version: null,
      },
      id: "item-1",
      userId,
    });
    expect(db.archiveItem).toHaveBeenCalledWith("item-1");
    expect(syncDeviceOutputs).toHaveBeenCalledTimes(3);
    expect(refreshSchedules).toHaveBeenCalledTimes(3);
  });

  it("알림 동기화 실패를 기록해도 화면 데이터는 새로 맞춘다", async () => {
    const error = new Error("알림 동기화 실패");

    await archiveSchedule({
      itemId: "item-1",
      syncDeviceOutputs: async () => {
        throw error;
      },
    });

    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { feature: "schedule-mutation-notification-sync" },
    });
    expect(refreshSchedules).toHaveBeenCalledTimes(1);
  });

  it("복구 불가 일정은 수정하지 않는다", async () => {
    jest
      .mocked(db.getItem)
      .mockResolvedValue(scheduleFixture({ contentStatus: "unrecoverable" }));

    await expect(
      updateSchedule({
        itemId: "item-1",
        patch: { title: "수정한 일정" },
        syncDeviceOutputs: jest.fn(),
        timezone,
        userId,
      })
    ).rejects.toThrow("내용을 복구할 수 없는 일정은 수정할 수 없습니다.");

    expect(listItemLogs).not.toHaveBeenCalled();
    expect(db.updateItem).not.toHaveBeenCalled();
  });

  it.each(["create", "update", "archive"])(
    "DB %s 실패 뒤에는 기기 갱신과 query 갱신을 하지 않는다",
    async (operation) => {
      const error = new Error("저장 실패");
      const syncDeviceOutputs = jest.fn();
      jest.mocked(db.createItem).mockRejectedValue(error);
      jest.mocked(db.updateItem).mockRejectedValue(error);
      jest.mocked(db.archiveItem).mockRejectedValue(error);
      const write =
        operation === "create"
          ? createSchedule({ input, syncDeviceOutputs, timezone, userId })
          : operation === "update"
            ? updateSchedule({
                itemId: "item-1",
                patch: { title: "변경" },
                syncDeviceOutputs,
                timezone,
                userId,
              })
            : archiveSchedule({ itemId: "item-1", syncDeviceOutputs });
      await expect(write).rejects.toBe(error);
      expect(syncDeviceOutputs).not.toHaveBeenCalled();
      expect(refreshSchedules).not.toHaveBeenCalled();
    }
  );
});
