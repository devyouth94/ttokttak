import { createLogs } from "~/schedule/db/logs";
import {
  logFixture,
  scheduleFixture,
  testTimezone as timezone,
} from "~/schedule/fixtures";
import { refreshSchedules } from "~/schedule/query";
import { createOccurrences, toUtcRange } from "~/schedule/rules/occurrence";
import { captureException } from "~/sentry";

import { resolveOccurrence } from "./action";

jest.mock("~/schedule/db/logs", () => ({ createLogs: jest.fn() }));
jest.mock("~/schedule/query", () => ({ refreshSchedules: jest.fn() }));
jest.mock("~/sentry", () => ({ captureException: jest.fn() }));

const now = new Date("2026-04-10T03:00:00.000Z");

function occurrence(item = scheduleFixture({ recurrenceType: "once" })) {
  return createOccurrences({
    logs: [],
    now,
    schedules: [item],
    timezone,
  }).range(toUtcRange("2026-04-10", timezone))[0]!.occurrence;
}

describe("홈 occurrence 처리", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createLogs).mockResolvedValue(undefined);
    jest.mocked(refreshSchedules).mockResolvedValue(undefined);
  });

  it("완료 기록을 만든 뒤 알림과 화면 데이터를 새로 맞춘다", async () => {
    const item = scheduleFixture({ id: "item-1", recurrenceType: "once" });
    const syncNotifications = jest.fn(async () => undefined);

    await resolveOccurrence({
      action: "completed",
      logs: [],
      now,
      syncNotifications,
      target: { item, occurrence: occurrence(item) },
      timezone,
      userId: "user-1",
    });

    expect(createLogs).toHaveBeenCalledWith([
      {
        action: "completed",
        itemId: "item-1",
        scheduledAtUtc: "2026-04-10T00:00:00.000Z",
        userId: "user-1",
      },
    ]);
    expect(syncNotifications).toHaveBeenCalledTimes(1);
    expect(refreshSchedules).toHaveBeenCalledTimes(1);
  });

  it("지난 일정을 처리하면 이전 미처리 occurrence도 함께 기록한다", async () => {
    const item = scheduleFixture({
      id: "item-1",
      intervalValue: 3,
      recurrenceType: "interval_days",
      startDateLocal: "2026-04-04",
    });
    const overdue = createOccurrences({
      logs: [],
      now,
      schedules: [item],
      timezone,
    })
      .range(
        {
          endUtc: now.toISOString(),
          startUtc: toUtcRange(item.startDateLocal, timezone).startUtc,
        },
        "overdue"
      )
      .at(-1)!.occurrence;

    await resolveOccurrence({
      action: "skipped",
      logs: [
        logFixture({
          itemId: item.id,
          scheduledAtUtc: "2026-04-04T00:00:00.000Z",
        }),
      ],
      now,
      syncNotifications: jest.fn(async () => undefined),
      target: { item, occurrence: overdue },
      timezone,
      userId: "user-1",
    });

    expect(createLogs).toHaveBeenCalledWith([
      {
        action: "skipped",
        itemId: "item-1",
        scheduledAtUtc: "2026-04-07T00:00:00.000Z",
        userId: "user-1",
      },
    ]);
  });

  it("알림 동기화 실패를 기록해도 화면 데이터는 새로 맞춘다", async () => {
    const error = new Error("알림 동기화 실패");
    const item = scheduleFixture({ recurrenceType: "once" });

    await resolveOccurrence({
      action: "completed",
      logs: [],
      now,
      syncNotifications: async () => {
        throw error;
      },
      target: { item, occurrence: occurrence(item) },
      timezone,
      userId: "user-1",
    });

    expect(captureException).toHaveBeenCalledWith(error, {
      tags: {
        feature: "home-feed-occurrence-notification-sync",
        reason: "occurrence-completed",
      },
    });
    expect(refreshSchedules).toHaveBeenCalledTimes(1);
  });
});
