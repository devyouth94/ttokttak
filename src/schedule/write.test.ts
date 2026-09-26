import { captureException } from "~/sentry";

import { invalidateScheduleCache } from "./cache";
import * as db from "./db/items";
import { createLogs, listItemLogs } from "./db/logs";
import { logFixture, scheduleFixture } from "./fixtures";
import { toUtcRange } from "./local-date";
import { createOccurrences } from "./rules/occurrence";
import {
  archiveSchedule,
  createSchedule,
  processOccurrence,
  updateSchedule,
} from "./write";

jest.mock("./db/items", () => ({
  archiveItem: jest.fn(),
  createItem: jest.fn(),
  getItem: jest.fn(),
  updateItem: jest.fn(),
}));
jest.mock("./db/logs", () => ({
  createLogs: jest.fn(),
  listItemLogs: jest.fn(),
}));
jest.mock("./cache", () => ({ invalidateScheduleCache: jest.fn() }));
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
    jest.mocked(createLogs).mockResolvedValue(undefined);
    jest.mocked(listItemLogs).mockResolvedValue([]);
    jest.mocked(invalidateScheduleCache).mockResolvedValue(undefined);
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
    await archiveSchedule({ itemId: "item-1", syncDeviceOutputs, userId });

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
    expect(invalidateScheduleCache).toHaveBeenCalledTimes(3);
    expect(invalidateScheduleCache).toHaveBeenCalledWith(userId);
  });

  it("알림 동기화 실패를 기록해도 화면 데이터는 새로 맞춘다", async () => {
    const error = new Error("알림 동기화 실패");

    await archiveSchedule({
      itemId: "item-1",
      syncDeviceOutputs: async () => {
        throw error;
      },
      userId,
    });

    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { feature: "schedule-mutation-notification-sync" },
    });
    expect(invalidateScheduleCache).toHaveBeenCalledTimes(1);
  });

  it.each(["completed", "skipped"] as const)(
    "%s occurrence 처리 기록을 한 번 저장한 뒤 순서대로 후처리한다",
    async (action) => {
      const syncDeviceOutputs = jest.fn(async () => undefined);
      const now = new Date("2026-04-12T03:00:00.000Z");
      const item = scheduleFixture({
        id: "item-1",
        recurrenceType: "daily",
        startDateLocal: "2026-04-10",
      });

      await processOccurrence({
        action,
        logs: [],
        now,
        syncDeviceOutputs,
        target: getTarget(item, "2026-04-11", now),
        timezone,
        userId,
      });

      expect(createLogs).toHaveBeenCalledWith([
        {
          action,
          itemId: "item-1",
          scheduledAtUtc: "2026-04-10T00:00:00.000Z",
          userId,
        },
        {
          action,
          itemId: "item-1",
          scheduledAtUtc: "2026-04-11T00:00:00.000Z",
          userId,
        },
      ]);
      expect(createLogs).toHaveBeenCalledTimes(1);
      expect(jest.mocked(createLogs).mock.invocationCallOrder[0]).toBeLessThan(
        syncDeviceOutputs.mock.invocationCallOrder[0]!
      );
      expect(syncDeviceOutputs.mock.invocationCallOrder[0]).toBeLessThan(
        jest.mocked(invalidateScheduleCache).mock.invocationCallOrder[0]!
      );
    }
  );

  it("빈 occurrence 대상은 저장하지 않고 후처리한다", async () => {
    const syncDeviceOutputs = jest.fn(async () => undefined);
    const now = new Date("2026-04-10T03:00:00.000Z");
    const item = scheduleFixture({ id: "item-1", recurrenceType: "once" });
    const target = getTarget(item, "2026-04-10", now);
    const logs = [
      logFixture({
        itemId: item.id,
        scheduledAtUtc: target.occurrence.scheduledAtUtc,
      }),
    ];

    await processOccurrence({
      action: "completed",
      logs,
      now,
      syncDeviceOutputs,
      target,
      timezone,
      userId,
    });

    expect(createLogs).not.toHaveBeenCalled();
    expect(syncDeviceOutputs).toHaveBeenCalledTimes(1);
    expect(invalidateScheduleCache).toHaveBeenCalledTimes(1);
  });

  it("occurrence 저장 실패 뒤에는 후처리하지 않는다", async () => {
    const error = new Error("저장 실패");
    const syncDeviceOutputs = jest.fn();
    const now = new Date("2026-04-10T03:00:00.000Z");
    const item = scheduleFixture({ id: "item-1", recurrenceType: "once" });
    jest.mocked(createLogs).mockRejectedValue(error);

    await expect(
      processOccurrence({
        action: "completed",
        logs: [],
        now,
        syncDeviceOutputs,
        target: getTarget(item, "2026-04-10", now),
        timezone,
        userId,
      })
    ).rejects.toBe(error);

    expect(syncDeviceOutputs).not.toHaveBeenCalled();
    expect(invalidateScheduleCache).not.toHaveBeenCalled();
  });

  it.each(["completed", "skipped"] as const)(
    "기기 갱신 실패 뒤에도 query를 갱신하고 %s 진단을 유지한다",
    async (action) => {
      const error = new Error("알림 동기화 실패");
      const now = new Date("2026-04-10T03:00:00.000Z");
      const item = scheduleFixture({ id: "item-1", recurrenceType: "once" });

      await processOccurrence({
        action,
        logs: [],
        now,
        syncDeviceOutputs: async () => {
          throw error;
        },
        target: getTarget(item, "2026-04-10", now),
        timezone,
        userId,
      });

      expect(captureException).toHaveBeenCalledWith(error, {
        tags: {
          feature: "home-feed-occurrence-notification-sync",
          reason:
            action === "completed"
              ? "occurrence-completed"
              : "occurrence-skipped",
        },
      });
      expect(invalidateScheduleCache).toHaveBeenCalledTimes(1);
    }
  );

  it("query 갱신 실패는 호출자에게 전달한다", async () => {
    const error = new Error("query 갱신 실패");
    const now = new Date("2026-04-10T03:00:00.000Z");
    const item = scheduleFixture({ id: "item-1", recurrenceType: "once" });
    jest.mocked(invalidateScheduleCache).mockRejectedValue(error);

    await expect(
      processOccurrence({
        action: "completed",
        logs: [],
        now,
        syncDeviceOutputs: async () => undefined,
        target: getTarget(item, "2026-04-10", now),
        timezone,
        userId,
      })
    ).rejects.toBe(error);
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
            : archiveSchedule({ itemId: "item-1", syncDeviceOutputs, userId });
      await expect(write).rejects.toBe(error);
      expect(syncDeviceOutputs).not.toHaveBeenCalled();
      expect(invalidateScheduleCache).not.toHaveBeenCalled();
    }
  );
});

function getTarget(
  schedule: ReturnType<typeof scheduleFixture>,
  localDate: string,
  now: Date
) {
  const occurrence = createOccurrences({
    logs: [],
    now,
    schedules: [schedule],
    timezone,
  }).range(toUtcRange(localDate, timezone))[0]!.occurrence;

  return { occurrence, schedule };
}
