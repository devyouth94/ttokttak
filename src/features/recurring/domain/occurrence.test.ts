import {
  getNextOccurrence,
  getOccurrencesInRange,
  hasOccurrenceBetweenLocalDates,
  resolveOccurrenceStatus,
} from "~/features/recurring/domain/occurrence";
import type {
  CompletionLog,
  RecurringItem,
  RecurringItemScheduleVersion,
} from "~/features/recurring/domain/types";

const timezone = "Asia/Seoul";

function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    id: "item-1",
    userId: "user-1",
    title: "테스트 항목",
    description: null,
    colorKey: "blue",
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
    createdAt: "2026-04-01T02:00:00.000Z",
    ...overrides,
  };
}

function createVersion(
  overrides: Partial<RecurringItemScheduleVersion> = {}
): RecurringItemScheduleVersion {
  return {
    id: "version-1",
    itemId: "item-1",
    userId: "user-1",
    effectiveFromUtc: "2026-04-01T00:00:00.000Z",
    recurrenceType: "daily",
    intervalValue: null,
    weekdayMask: null,
    reminderTimeLocal: "09:00",
    anchorType: "fixed",
    seedStartDateLocal: "2026-04-01",
    notificationsEnabled: true,
    createdAt: "2026-04-01T00:00:00.000Z",
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

  it("weekly 첫 occurrence는 start date 이후 가장 가까운 선택 요일로 계산한다", () => {
    const item = createItem({
      recurrenceType: "weekly",
      startDateLocal: "2026-04-22",
      weekdayMask: [5],
    });

    const occurrences = getOccurrencesInRange(
      item,
      "2026-04-21T15:00:00.000Z",
      "2026-05-08T14:59:59.999Z",
      timezone,
      [],
      "2026-04-22T03:00:00.000Z"
    );

    expect(occurrences.map((occurrence) => occurrence.localDate)).toEqual([
      "2026-04-24",
      "2026-05-01",
      "2026-05-08",
    ]);
  });

  it("interval_weeks 첫 occurrence도 start date 이후 선택 요일과 주차 간격을 모두 지킨다", () => {
    const item = createItem({
      intervalValue: 2,
      recurrenceType: "interval_weeks",
      startDateLocal: "2026-04-22",
      weekdayMask: [1, 5],
    });

    const occurrences = getOccurrencesInRange(
      item,
      "2026-04-21T15:00:00.000Z",
      "2026-05-22T14:59:59.999Z",
      timezone,
      [],
      "2026-04-22T03:00:00.000Z"
    );

    expect(occurrences.map((occurrence) => occurrence.localDate)).toEqual([
      "2026-04-24",
      "2026-05-04",
      "2026-05-08",
      "2026-05-18",
      "2026-05-22",
    ]);
  });

  it("규칙 수정 후에는 새 version이 미래 occurrence만 덮어쓴다", () => {
    const item = createItem({
      intervalValue: 3,
      recurrenceType: "interval_days",
      scheduleVersions: [
        createVersion({
          id: "version-1",
          intervalValue: 3,
          recurrenceType: "interval_days",
          seedStartDateLocal: "2026-04-10",
        }),
        createVersion({
          id: "version-2",
          effectiveFromUtc: "2026-04-14T01:00:00.000Z",
          intervalValue: 4,
          recurrenceType: "interval_days",
          seedStartDateLocal: "2026-04-17",
        }),
      ],
      startDateLocal: "2026-04-10",
    });

    const occurrences = getOccurrencesInRange(
      item,
      "2026-04-10T00:00:00.000Z",
      "2026-04-23T23:59:59.999Z",
      timezone,
      [],
      "2026-04-14T01:00:00.000Z"
    );

    expect(occurrences.map((occurrence) => occurrence.localDate)).toEqual([
      "2026-04-10",
      "2026-04-13",
      "2026-04-17",
      "2026-04-21",
    ]);
  });

  it("completion_based 수정 version은 edit 이전 마지막 completed를 초기 anchor로 이어받는다", () => {
    const item = createItem({
      anchorType: "completion_based",
      recurrenceType: "interval_days",
      intervalValue: 3,
      scheduleVersions: [
        createVersion({
          anchorType: "completion_based",
          id: "version-1",
          intervalValue: 3,
          recurrenceType: "interval_days",
          seedStartDateLocal: "2026-04-10",
        }),
        createVersion({
          anchorType: "completion_based",
          effectiveFromUtc: "2026-04-14T01:00:00.000Z",
          id: "version-2",
          intervalValue: 4,
          recurrenceType: "interval_days",
          seedStartDateLocal: "2026-04-17",
        }),
      ],
      startDateLocal: "2026-04-10",
    });
    const completedLog = createLog({
      actedAtUtc: "2026-04-13T02:00:00.000Z",
      scheduledAtUtc: "2026-04-13T00:00:00.000Z",
    });

    const nextOccurrence = getNextOccurrence(
      item,
      "2026-04-14T01:00:00.000Z",
      timezone,
      [completedLog]
    );

    expect(nextOccurrence?.localDate).toBe("2026-04-17");
  });

  it("생성일이 오늘이면 시간이 지났어도 첫 occurrence를 오늘로 유지한다", () => {
    const item = createItem({
      createdAt: "2026-04-14T08:00:00.000Z",
      intervalValue: 3,
      recurrenceType: "interval_days",
      startDateLocal: "2026-04-14",
    });

    const occurrences = getOccurrencesInRange(
      item,
      "2026-04-14T00:00:00.000Z",
      "2026-04-20T23:59:59.999Z",
      timezone,
      [],
      "2026-04-14T08:00:00.000Z"
    );

    expect(occurrences.map((occurrence) => occurrence.localDate)).toEqual([
      "2026-04-14",
      "2026-04-17",
      "2026-04-20",
    ]);
    expect(occurrences[0]?.status).toBe("scheduled");
  });

  it("종료일이 있으면 종료일 local date까지만 occurrence를 계산한다", () => {
    const item = createItem({
      scheduleVersions: [
        createVersion({
          endDateLocal: "2026-04-03",
          recurrenceType: "daily",
          seedStartDateLocal: "2026-04-01",
        }),
      ],
    });

    const occurrences = getOccurrencesInRange(
      item,
      "2026-03-31T15:00:00.000Z",
      "2026-04-04T14:59:59.999Z",
      timezone,
      [],
      "2026-04-01T00:00:00.000Z"
    );

    expect(occurrences.map((occurrence) => occurrence.localDate)).toEqual([
      "2026-04-01",
      "2026-04-02",
      "2026-04-03",
    ]);
  });

  it("종료일이 지난 일정은 다음 occurrence를 만들지 않는다", () => {
    const item = createItem({
      scheduleVersions: [
        createVersion({
          endDateLocal: "2026-04-03",
          recurrenceType: "daily",
          seedStartDateLocal: "2026-04-01",
        }),
      ],
    });

    const nextOccurrence = getNextOccurrence(
      item,
      "2026-04-03T15:00:00.000Z",
      timezone,
      []
    );

    expect(nextOccurrence).toBeNull();
  });

  it("completion_based 종료일도 완료한 날짜가 아니라 occurrence local date로 자른다", () => {
    const item = createItem({
      anchorType: "completion_based",
      recurrenceType: "daily",
      scheduleVersions: [
        createVersion({
          anchorType: "completion_based",
          endDateLocal: "2026-04-02",
          recurrenceType: "daily",
          seedStartDateLocal: "2026-04-01",
        }),
      ],
    });
    const completedAfterEndDate = createLog({
      actedAtUtc: "2026-04-05T03:00:00.000Z",
      scheduledAtUtc: "2026-04-01T00:00:00.000Z",
    });

    const occurrences = getOccurrencesInRange(
      item,
      "2026-03-31T15:00:00.000Z",
      "2026-04-06T14:59:59.999Z",
      timezone,
      [completedAfterEndDate],
      "2026-04-01T00:00:00.000Z"
    );

    expect(occurrences.map((occurrence) => occurrence.localDate)).toEqual([
      "2026-04-01",
    ]);
  });
});

describe("hasOccurrenceBetweenLocalDates", () => {
  it("긴 주 단위 간격의 첫 occurrence가 1000일 뒤여도 종료일 안에 있으면 true를 반환한다", () => {
    expect(
      hasOccurrenceBetweenLocalDates({
        endDateLocal: "2029-11-05",
        intervalValue: 200,
        recurrenceType: "interval_weeks",
        startDateLocal: "2026-01-07",
        weekdayMask: [1],
      })
    ).toBe(true);
  });

  it("주 단위 간격이 유효하지 않으면 false를 반환한다", () => {
    expect(
      hasOccurrenceBetweenLocalDates({
        endDateLocal: "2026-05-07",
        intervalValue: 0,
        recurrenceType: "interval_weeks",
        startDateLocal: "2026-05-06",
        weekdayMask: [5],
      })
    ).toBe(false);
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
