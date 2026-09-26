import { createOccurrences, toUtcRange } from "./occurrence";
import type { RecurrenceType } from "./recurrence";
import {
  logFixture as createLog,
  ruleFixture as createVersion,
  scheduleFixture as createSchedule,
  testTimezone as timezone,
} from "../fixtures";
import type { Schedule } from "../schedule";

function dates(
  schedule: Schedule,
  startDate: string,
  endDate: string,
  now = new Date("2026-04-10T03:00:00.000Z")
) {
  return createOccurrences({
    logs: [],
    now,
    schedules: [schedule],
    timezone,
  })
    .range({
      endUtc: toUtcRange(endDate, timezone).endUtc,
      startUtc: toUtcRange(startDate, timezone).startUtc,
    })
    .map(({ occurrence }) => occurrence.localDate);
}

describe("occurrence 계산", () => {
  it.each<{
    expected: string[];
    intervalValue?: number;
    recurrenceType: RecurrenceType;
    startDateLocal: string;
    weekdayMask?: number[];
  }>([
    {
      expected: ["2026-04-10"],
      recurrenceType: "once",
      startDateLocal: "2026-04-10",
    },
    {
      expected: ["2026-04-10", "2026-04-11", "2026-04-12"],
      recurrenceType: "daily",
      startDateLocal: "2026-04-10",
    },
    {
      expected: ["2026-04-10", "2026-04-13"],
      intervalValue: 3,
      recurrenceType: "interval_days",
      startDateLocal: "2026-04-10",
    },
    {
      expected: ["2026-04-10", "2026-04-17"],
      recurrenceType: "weekly",
      startDateLocal: "2026-04-08",
      weekdayMask: [5],
    },
    {
      expected: ["2026-04-10", "2026-04-24"],
      intervalValue: 2,
      recurrenceType: "interval_weeks",
      startDateLocal: "2026-04-08",
      weekdayMask: [5],
    },
    {
      expected: ["2026-01-31", "2026-02-28", "2026-03-31"],
      recurrenceType: "monthly",
      startDateLocal: "2026-01-31",
    },
    {
      expected: ["2026-01-31", "2026-03-31"],
      intervalValue: 2,
      recurrenceType: "interval_months",
      startDateLocal: "2026-01-31",
    },
  ])("$recurrenceType 반복 날짜를 계산한다", ({ expected, ...rule }) => {
    const schedule = createSchedule(rule);

    expect(dates(schedule, rule.startDateLocal, expected.at(-1)!)).toEqual(
      expected
    );
  });

  it("주간 반복은 시작일 이후 선택 요일과 주차 간격을 지킨다", () => {
    const schedule = createSchedule({
      intervalValue: 2,
      recurrenceType: "interval_weeks",
      startDateLocal: "2026-04-22",
      weekdayMask: [1, 5],
    });

    expect(dates(schedule, "2026-04-22", "2026-05-22")).toEqual([
      "2026-04-24",
      "2026-05-04",
      "2026-05-08",
      "2026-05-18",
      "2026-05-22",
    ]);
  });

  it("월간 반복은 다음 달의 말일로 보정한 뒤 원래 일자를 복원한다", () => {
    const schedule = createSchedule({
      recurrenceType: "monthly",
      startDateLocal: "2024-01-31",
    });

    expect(dates(schedule, "2024-01-31", "2024-04-30")).toEqual([
      "2024-01-31",
      "2024-02-29",
      "2024-03-31",
      "2024-04-30",
    ]);
  });

  it.each<{
    expected: string;
    intervalValue: number | null;
    label: string;
    recurrenceType: RecurrenceType;
  }>([
    {
      expected: "2026-04-06",
      intervalValue: null,
      label: "매일",
      recurrenceType: "daily",
    },
    {
      expected: "2026-04-08",
      intervalValue: 3,
      label: "n일마다",
      recurrenceType: "interval_days",
    },
    {
      expected: "2026-05-05",
      intervalValue: null,
      label: "매달",
      recurrenceType: "monthly",
    },
    {
      expected: "2026-07-05",
      intervalValue: 3,
      label: "n달마다",
      recurrenceType: "interval_months",
    },
  ])("$label 완료일 기준은 완료 날짜를 다음 기준으로 사용한다", (rule) => {
    const schedule = createSchedule({
      anchorType: "completion_based",
      intervalValue: rule.intervalValue,
      recurrenceType: rule.recurrenceType,
      startDateLocal: "2026-04-01",
    });
    const completed = createOccurrences({
      logs: [
        createLog({
          actedAtUtc: "2026-04-05T03:00:00.000Z",
          scheduledAtUtc: "2026-04-01T00:00:00.000Z",
        }),
      ],
      now: new Date("2026-04-05T03:00:00.000Z"),
      schedules: [schedule],
      timezone,
    });

    expect(completed.next(schedule.id)?.localDate).toBe(rule.expected);
  });

  it("건너뛰기는 완료일 기준을 옮기지 않는다", () => {
    const schedule = createSchedule({
      anchorType: "completion_based",
      intervalValue: 3,
      recurrenceType: "interval_months",
      startDateLocal: "2026-04-01",
    });
    const skipped = createOccurrences({
      logs: [
        createLog({
          action: "skipped",
          actedAtUtc: "2026-04-05T03:00:00.000Z",
          scheduledAtUtc: "2026-04-01T00:00:00.000Z",
        }),
      ],
      now: new Date("2026-04-05T03:00:00.000Z"),
      schedules: [schedule],
      timezone,
    });

    expect(skipped.next(schedule.id)?.localDate).toBe("2026-07-01");
  });

  it("새 규칙 버전은 적용 전 마지막 완료를 초기 기준으로 사용한다", () => {
    const schedule = createSchedule({
      startDateLocal: "2026-03-01",
      versions: [
        createVersion({
          anchorType: "completion_based",
          effectiveFromUtc: "2026-04-10T00:00:00.000Z",
          recurrenceType: "monthly",
          seedStartDateLocal: "2026-04-10",
        }),
      ],
    });
    const occurrences = createOccurrences({
      logs: [
        createLog({
          actedAtUtc: "2026-04-01T03:00:00.000Z",
          scheduledAtUtc: "2026-03-01T00:00:00.000Z",
        }),
      ],
      now: new Date("2026-04-11T03:00:00.000Z"),
      schedules: [schedule],
      timezone,
    });

    expect(occurrences.next(schedule.id)?.localDate).toBe("2026-05-01");
  });

  it("완료일 기준도 occurrence 날짜에 종료일을 적용한다", () => {
    const schedule = createSchedule({
      anchorType: "completion_based",
      endDateLocal: "2026-04-07",
      intervalValue: 3,
      recurrenceType: "interval_days",
      startDateLocal: "2026-04-01",
    });
    const occurrences = createOccurrences({
      logs: [
        createLog({
          actedAtUtc: "2026-04-05T03:00:00.000Z",
          scheduledAtUtc: "2026-04-01T00:00:00.000Z",
        }),
      ],
      now: new Date("2026-04-05T03:00:00.000Z"),
      schedules: [schedule],
      timezone,
    });

    expect(occurrences.next(schedule.id)).toBeNull();
  });

  it("version 적용 시각과 종료일로 occurrence 범위를 자른다", () => {
    const schedule = createSchedule({
      versions: [
        createVersion({
          intervalValue: 3,
          recurrenceType: "interval_days",
          seedStartDateLocal: "2026-04-10",
        }),
        createVersion({
          effectiveFromUtc: "2026-04-14T01:00:00.000Z",
          endDateLocal: "2026-04-21",
          intervalValue: 4,
          recurrenceType: "interval_days",
          seedStartDateLocal: "2026-04-17",
        }),
      ],
      startDateLocal: "2026-04-10",
    });

    expect(dates(schedule, "2026-04-10", "2026-04-25")).toEqual([
      "2026-04-10",
      "2026-04-13",
      "2026-04-17",
      "2026-04-21",
    ]);
  });

  it("처리 기록과 오늘 local date로 상태를 정한다", () => {
    const schedule = createSchedule({ startDateLocal: "2026-04-08" });
    const occurrences = createOccurrences({
      logs: [
        createLog({
          action: "completed",
          scheduledAtUtc: "2026-04-09T00:00:00.000Z",
        }),
        createLog({
          action: "skipped",
          id: "log-2",
          scheduledAtUtc: "2026-04-10T00:00:00.000Z",
        }),
      ],
      now: new Date("2026-04-11T03:00:00.000Z"),
      schedules: [schedule],
      timezone,
    });

    expect(
      occurrences
        .range({
          endUtc: toUtcRange("2026-04-12", timezone).endUtc,
          startUtc: toUtcRange("2026-04-08", timezone).startUtc,
        })
        .map(({ occurrence }) => occurrence.status)
    ).toEqual(["overdue", "completed", "skipped", "scheduled", "scheduled"]);
  });

  it("사용자 시간대의 날짜와 시각으로 예정 시점과 상태를 정한다", () => {
    const profileTimezone = "America/Los_Angeles";
    const schedule = createSchedule({
      reminderTimeLocal: "09:00",
      startDateLocal: "2026-01-15",
      timezone: profileTimezone,
    });
    const scheduledAtUtc = "2026-01-15T17:00:00.000Z";
    const beforeMidnight = createOccurrences({
      logs: [],
      now: new Date("2026-01-16T07:59:59.999Z"),
      schedules: [schedule],
      timezone: profileTimezone,
    });
    const afterMidnight = createOccurrences({
      logs: [],
      now: new Date("2026-01-16T08:00:00.000Z"),
      schedules: [schedule],
      timezone: profileTimezone,
    });

    expect(beforeMidnight.find(schedule.id, scheduledAtUtc)).toMatchObject({
      localDate: "2026-01-15",
      scheduledAtUtc,
      status: "scheduled",
    });
    expect(afterMidnight.find(schedule.id, scheduledAtUtc)?.status).toBe(
      "overdue"
    );
  });

  it("range, next, find의 조회 규칙을 유지한다", () => {
    const second = createSchedule({
      id: "second",
      reminderTimeLocal: "18:00",
      startDateLocal: "2026-04-10",
    });
    const first = createSchedule({ id: "first" });
    const occurrences = createOccurrences({
      logs: [],
      now: new Date("2026-04-10T03:00:00.000Z"),
      schedules: [second, first],
      timezone,
    });

    expect(
      occurrences
        .range(toUtcRange("2026-04-10", timezone))
        .map(({ schedule }) => schedule.id)
    ).toEqual(["second", "first"]);
    expect(occurrences.next("second")?.scheduledAtUtc).toBe(
      "2026-04-10T09:00:00.000Z"
    );
    expect(occurrences.find("first", "2026-04-10T00:00:00.000Z")).toEqual({
      localDate: "2026-04-10",
      scheduledAtUtc: "2026-04-10T00:00:00.000Z",
      status: "scheduled",
    });
    expect(occurrences.next("missing")).toBeNull();
    expect(occurrences.find("missing", "2026-04-10T00:00:00.000Z")).toBeNull();
    expect(
      occurrences.range({
        endUtc: "2026-04-10T00:00:00.000Z",
        startUtc: "2026-04-11T00:00:00.000Z",
      })
    ).toEqual([]);
  });

  it("다음 날짜가 진전하지 않는 규칙은 즉시 실패한다", () => {
    const schedule = createSchedule({
      intervalValue: 0,
      recurrenceType: "interval_days",
    });
    const occurrences = createOccurrences({
      logs: [],
      now: new Date("2026-04-10T03:00:00.000Z"),
      schedules: [schedule],
      timezone,
    });

    expect(() =>
      occurrences.range({
        endUtc: toUtcRange("2026-04-12", timezone).endUtc,
        startUtc: toUtcRange("2026-04-10", timezone).startUtc,
      })
    ).toThrow("반복 규칙의 다음 날짜는 현재 날짜보다 느려야 합니다.");
  });
});
