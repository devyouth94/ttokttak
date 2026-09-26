import { captureException } from "~/sentry";

import { invalidateScheduleCache } from "./cache";
import * as db from "./db/items";
import { createLogs, listItemLogs } from "./db/logs";
import { logFixture, scheduleFixture } from "./fixtures";
import { toUtcRange } from "./local-date";
import type {
  CreateScheduleInput,
  OccurrenceEntry,
  OccurrenceLog,
} from "./model";
import { createOccurrences } from "./rules/occurrence";
import { createSchedule, processOccurrence } from "./write";

jest.mock("~/sentry", () => ({ captureException: jest.fn() }));
jest.mock("./cache", () => ({ invalidateScheduleCache: jest.fn() }));
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

const timezone = "Asia/Seoul";
const userId = "user-1";
const now = new Date("2026-09-10T03:00:00.000Z");

const input: CreateScheduleInput = {
  anchorType: "fixed",
  colorHex: "#9DB7F5",
  description: null,
  endDateLocal: null,
  intervalValue: null,
  notificationsEnabled: true,
  recurrenceType: "daily",
  reminderTimeLocal: "09:00",
  startDateLocal: "2026-09-10",
  title: "물 마시기",
  weekdayMask: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(db.createItem).mockResolvedValue();
  jest.mocked(createLogs).mockResolvedValue();
  jest.mocked(listItemLogs).mockResolvedValue([]);
  jest.mocked(invalidateScheduleCache).mockResolvedValue();
});

it.each(["completed", "skipped"] as const)(
  "지난 occurrence 처리 시 미처리 기록에만 %s를 적용한다",
  async (action) => {
    const schedule = scheduleFixture({
      id: "target",
      startDateLocal: "2026-09-05",
    });
    const logs = [
      logFixture({
        itemId: schedule.id,
        scheduledAtUtc: "2026-09-06T00:00:00.000Z",
      }),
      logFixture({
        action: "skipped",
        id: "log-2",
        itemId: schedule.id,
        scheduledAtUtc: "2026-09-07T00:00:00.000Z",
      }),
      logFixture({
        id: "other-log",
        itemId: "other",
        scheduledAtUtc: "2026-09-08T00:00:00.000Z",
      }),
    ];

    await processOccurrence({
      action,
      logs,
      now,
      syncDeviceOutputs: jest.fn(async () => undefined),
      target: targetOn(schedule, "2026-09-09", logs),
      timezone,
      userId,
    });

    expect(createLogs).toHaveBeenCalledWith(
      ["2026-09-05", "2026-09-08", "2026-09-09"].map((date) => ({
        action,
        itemId: schedule.id,
        scheduledAtUtc: `${date}T00:00:00.000Z`,
        userId,
      }))
    );
  }
);

it("이미 처리한 occurrence 재요청은 새 기록을 만들지 않는다", async () => {
  const schedule = scheduleFixture({
    recurrenceType: "once",
    startDateLocal: "2026-09-10",
  });
  const logs = [
    logFixture({
      itemId: schedule.id,
      scheduledAtUtc: "2026-09-10T00:00:00.000Z",
    }),
  ];

  await processOccurrence({
    action: "skipped",
    logs,
    now,
    syncDeviceOutputs: jest.fn(async () => undefined),
    target: targetOn(schedule, "2026-09-10", logs),
    timezone,
    userId,
  });

  expect(createLogs).not.toHaveBeenCalled();
});

it("DB 저장 실패는 기기 동기화와 query 무효화를 실행하지 않는다", async () => {
  const error = new Error("저장 실패");
  const schedule = scheduleFixture({
    recurrenceType: "once",
    startDateLocal: "2026-09-10",
  });
  const syncDeviceOutputs = jest.fn();
  jest.mocked(createLogs).mockRejectedValue(error);

  await expect(
    processOccurrence({
      action: "completed",
      logs: [],
      now,
      syncDeviceOutputs,
      target: targetOn(schedule, "2026-09-10", []),
      timezone,
      userId,
    })
  ).rejects.toBe(error);
  expect(syncDeviceOutputs).not.toHaveBeenCalled();
  expect(invalidateScheduleCache).not.toHaveBeenCalled();
});

it("DB 저장 뒤 기기 동기화 실패는 저장을 되돌리지 않고 query를 무효화한다", async () => {
  const error = new Error("기기 동기화 실패");

  await expect(
    createSchedule({
      input,
      syncDeviceOutputs: async () => {
        throw error;
      },
      timezone,
      userId,
    })
  ).resolves.toBeUndefined();

  expect(db.createItem).toHaveBeenCalledTimes(1);
  expect(captureException).toHaveBeenCalledWith(error, {
    tags: { feature: "schedule-mutation-notification-sync" },
  });
  expect(invalidateScheduleCache).toHaveBeenCalledWith(userId);
});

function targetOn(
  schedule: ReturnType<typeof scheduleFixture>,
  localDate: string,
  logs: OccurrenceLog[]
): OccurrenceEntry {
  const target = createOccurrences({
    logs,
    now,
    schedules: [schedule],
    timezone,
  })
    .range(toUtcRange(localDate, timezone))
    .find(({ occurrence }) => occurrence.localDate === localDate);

  if (!target) {
    throw new Error("처리할 occurrence를 찾지 못했습니다.");
  }

  return target;
}
