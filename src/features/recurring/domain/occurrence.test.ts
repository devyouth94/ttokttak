import {
  getNextOccurrence,
  getOccurrencesInRange,
  resolveOccurrenceStatus,
} from "~/features/recurring/domain/occurrence";
import type {
  CompletionLog,
  RecurringItem,
} from "~/features/recurring/domain/types";

const timezone = "Asia/Seoul";

function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    id: "item-1",
    userId: "user-1",
    title: "테스트 항목",
    description: null,
    category: null,
    recurrenceType: "daily",
    intervalValue: null,
    weekdayMask: null,
    startDateLocal: "2026-04-01",
    reminderTimeLocal: "09:00",
    notificationsEnabled: true,
    anchorType: "fixed",
    timezone,
    isArchived: false,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function createLog(overrides: Partial<CompletionLog> = {}): CompletionLog {
  return {
    id: "log-1",
    userId: "user-1",
    itemId: "item-1",
    scheduledAtUtc: "2026-04-01T00:00:00.000Z",
    action: "completed",
    actedAtUtc: "2026-04-01T02:00:00.000Z",
    deviceId: null,
    createdAt: "2026-04-01T02:00:00.000Z",
    ...overrides,
  };
}

describe("getOccurrencesInRange", () => {
  it("월말 보정 규칙으로 monthly occurrence를 계산한다", () => {
    const item = createItem({
      recurrenceType: "monthly",
      startDateLocal: "2024-01-31",
    });

    const occurrences = getOccurrencesInRange(
      item,
      "2024-02-01T00:00:00.000Z",
      "2024-04-30T23:59:59.999Z",
      timezone,
      [],
      "2024-02-01T00:00:00.000Z"
    );

    expect(occurrences.map((occurrence) => occurrence.localDate)).toEqual([
      "2024-02-29",
      "2024-03-31",
      "2024-04-30",
    ]);
  });

  it("completion_based는 completed 기준으로 다음 occurrence를 이동한다", () => {
    const item = createItem({
      anchorType: "completion_based",
      recurrenceType: "interval_months",
      intervalValue: 3,
      startDateLocal: "2026-01-01",
    });
    const completedLog = createLog({
      scheduledAtUtc: "2026-04-01T00:00:00.000Z",
      actedAtUtc: "2026-04-05T03:00:00.000Z",
    });

    const nextOccurrence = getNextOccurrence(
      item,
      "2026-04-05T03:00:00.000Z",
      timezone,
      [completedLog]
    );

    expect(nextOccurrence?.localDate).toBe("2026-07-05");
  });

  it("completion_based에서도 skipped는 anchor를 이동시키지 않는다", () => {
    const item = createItem({
      anchorType: "completion_based",
      recurrenceType: "interval_months",
      intervalValue: 3,
      startDateLocal: "2026-01-01",
    });
    const skippedLog = createLog({
      action: "skipped",
      scheduledAtUtc: "2026-04-01T00:00:00.000Z",
      actedAtUtc: "2026-04-05T03:00:00.000Z",
    });

    const nextOccurrence = getNextOccurrence(
      item,
      "2026-04-05T03:00:00.000Z",
      timezone,
      [skippedLog]
    );

    expect(nextOccurrence?.localDate).toBe("2026-07-01");
  });

  it("weekly 계열은 completion_based가 들어와도 고정된 요일 패턴을 유지한다", () => {
    const item = createItem({
      anchorType: "completion_based",
      recurrenceType: "weekly",
      startDateLocal: "2026-04-06",
      weekdayMask: [1],
    });
    const completedLog = createLog({
      scheduledAtUtc: "2026-04-06T00:00:00.000Z",
      actedAtUtc: "2026-04-08T03:00:00.000Z",
    });

    const nextOccurrence = getNextOccurrence(
      item,
      "2026-04-08T03:00:00.000Z",
      timezone,
      [completedLog]
    );

    expect(nextOccurrence?.localDate).toBe("2026-04-13");
  });
});

describe("resolveOccurrenceStatus", () => {
  it("같은 로컬 날짜의 occurrence는 시간이 지나도 scheduled로 유지한다", () => {
    const scheduledAtUtc = "2026-04-01T00:00:00.000Z";

    expect(
      resolveOccurrenceStatus(
        scheduledAtUtc,
        new Map(),
        "2026-04-01T03:00:00.000Z",
        timezone
      )
    ).toBe("scheduled");
  });

  it("로컬 날짜가 지나면 overdue로 바뀐다", () => {
    const scheduledAtUtc = "2026-04-01T00:00:00.000Z";

    expect(
      resolveOccurrenceStatus(
        scheduledAtUtc,
        new Map([[scheduledAtUtc, createLog({ action: "completed" })]]),
        "2026-04-02T00:00:00.000Z",
        timezone
      )
    ).toBe("completed");

    expect(
      resolveOccurrenceStatus(
        scheduledAtUtc,
        new Map(),
        "2026-04-02T00:00:00.000Z",
        timezone
      )
    ).toBe("overdue");
  });
});
