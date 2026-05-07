import {
  createItemOccurrenceProjection,
  createLocalDateUtcRange,
} from "~/features/recurring/domain/occurrence-projection";
import type {
  CompletionLog,
  RecurringItem,
} from "~/features/recurring/domain/types";

const timezone = "Asia/Seoul";

function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    anchorType: "fixed",
    category: null,
    colorKey: "blue",
    createdAt: "2026-04-01T00:00:00.000Z",
    description: null,
    id: "item-1",
    intervalValue: null,
    isArchived: false,
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: "09:00",
    startDateLocal: "2026-04-10",
    timezone,
    title: "테스트 일정",
    updatedAt: "2026-04-01T00:00:00.000Z",
    userId: "user-1",
    weekdayMask: null,
    ...overrides,
  };
}

function createLog(overrides: Partial<CompletionLog> = {}): CompletionLog {
  return {
    actedAtUtc: "2026-04-11T00:05:00.000Z",
    action: "completed",
    createdAt: "2026-04-11T00:05:00.000Z",
    deviceId: null,
    id: "log-1",
    itemId: "item-1",
    scheduledAtUtc: "2026-04-11T00:00:00.000Z",
    userId: "user-1",
    ...overrides,
  };
}

describe("occurrence projection", () => {
  it("local date range를 timezone 기준 UTC range로 바꾼다", () => {
    expect(createLocalDateUtcRange("2026-04-12", timezone)).toEqual({
      endUtc: "2026-04-12T14:59:59.999Z",
      startUtc: "2026-04-11T15:00:00.000Z",
    });
  });

  it("일정 하나 기준 range occurrence와 scheduled occurrence를 고른다", () => {
    const projection = createItemOccurrenceProjection({
      completionLogs: [],
      item: createItem(),
      now: new Date("2026-04-12T03:00:00.000Z"),
      timezone,
    });
    const range = {
      endUtc: createLocalDateUtcRange("2026-04-12", timezone).endUtc,
      startUtc: createLocalDateUtcRange("2026-04-10", timezone).startUtc,
    };

    expect(
      projection
        .getOccurrencesInRange(range)
        .map((occurrence) => occurrence.localDate)
    ).toEqual(["2026-04-10", "2026-04-11", "2026-04-12"]);
    expect(
      projection
        .getScheduledOccurrencesInRange(range)
        .map((occurrence) => occurrence.localDate)
    ).toEqual(["2026-04-12"]);
  });

  it("overdue occurrence는 기본 오름차순이고 최신 overdue도 제공한다", () => {
    const projection = createItemOccurrenceProjection({
      completionLogs: [],
      item: createItem(),
      now: new Date("2026-04-12T03:00:00.000Z"),
      timezone,
    });

    expect(
      projection
        .getOverdueOccurrences({ lookbackStartLocalDate: "2026-04-10" })
        .map((occurrence) => occurrence.localDate)
    ).toEqual(["2026-04-10", "2026-04-11"]);
    expect(
      projection.getLatestOverdueOccurrence({
        lookbackStartLocalDate: "2026-04-10",
      })?.localDate
    ).toBe("2026-04-11");
  });

  it("다음 occurrence와 상세 진입 맥락 occurrence를 고른다", () => {
    const projection = createItemOccurrenceProjection({
      completionLogs: [createLog()],
      item: createItem(),
      now: new Date("2026-04-12T03:00:00.000Z"),
      timezone,
    });

    expect(projection.getNextOccurrence()?.localDate).toBe("2026-04-13");
    expect(
      projection.getBasisOccurrence({
        scheduledAtUtc: "2026-04-11T00:00:00.000Z",
      })
    ).toMatchObject({
      localDate: "2026-04-11",
      status: "completed",
    });
  });
});
