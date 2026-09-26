import { createOccurrences } from "./occurrence";
import {
  logFixture,
  scheduleFixture,
  type ScheduleOverrides,
} from "../fixtures";
import { toUtcRange } from "../local-date";
import type { OccurrenceLog, Schedule } from "../model";

function localDates({
  endDate,
  logs = [],
  now = new Date("2026-09-10T03:00:00.000Z"),
  schedule,
  startDate,
  timezone = "Asia/Seoul",
}: {
  endDate: string;
  logs?: OccurrenceLog[];
  now?: Date;
  schedule: Schedule;
  startDate: string;
  timezone?: string;
}): string[] {
  return createOccurrences({ logs, now, schedules: [schedule], timezone })
    .range({
      endUtc: toUtcRange(endDate, timezone).endUtc,
      startUtc: toUtcRange(startDate, timezone).startUtc,
    })
    .map(({ occurrence }) => occurrence.localDate);
}

describe("occurrence 반복 계산", () => {
  it.each<{
    endDate: string;
    expected: string[];
    rule: ScheduleOverrides;
    startDate: string;
  }>([
    {
      endDate: "2026-04-30",
      expected: ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"],
      rule: { recurrenceType: "monthly", startDateLocal: "2026-01-31" },
      startDate: "2026-01-31",
    },
    {
      endDate: "2028-02-29",
      expected: ["2028-01-31", "2028-02-29"],
      rule: { recurrenceType: "monthly", startDateLocal: "2028-01-31" },
      startDate: "2028-01-31",
    },
    {
      endDate: "2026-04-30",
      expected: ["2025-12-31", "2026-02-28", "2026-04-30"],
      rule: {
        intervalValue: 2,
        recurrenceType: "interval_months",
        startDateLocal: "2025-12-31",
      },
      startDate: "2025-12-31",
    },
    {
      endDate: "2026-09-30",
      expected: [
        "2026-09-02",
        "2026-09-13",
        "2026-09-16",
        "2026-09-27",
        "2026-09-30",
      ],
      rule: {
        intervalValue: 2,
        recurrenceType: "interval_weeks",
        startDateLocal: "2026-09-02",
        weekdayMask: [0, 3],
      },
      startDate: "2026-09-02",
    },
    {
      endDate: "2026-09-09",
      expected: ["2026-09-02", "2026-09-06", "2026-09-09"],
      rule: {
        recurrenceType: "weekly",
        startDateLocal: "2026-09-02",
        weekdayMask: [0, 3],
      },
      startDate: "2026-09-02",
    },
  ])(
    "달력 경계를 유지한다: $expected",
    ({ endDate, expected, rule, startDate }) => {
      expect(
        localDates({
          endDate,
          schedule: scheduleFixture(rule),
          startDate,
        })
      ).toEqual(expected);
    }
  );

  it("완료일 기준은 조회 범위 밖의 전체 완료 이력으로 다음 날짜를 계산한다", () => {
    const schedule = scheduleFixture({
      anchorType: "completion_based",
      intervalValue: 3,
      recurrenceType: "interval_days",
      startDateLocal: "2026-09-01",
    });
    const logs = [
      logFixture({
        actedAtUtc: "2026-09-03T03:00:00.000Z",
        scheduledAtUtc: "2026-09-01T00:00:00.000Z",
      }),
      logFixture({
        actedAtUtc: "2026-09-07T03:00:00.000Z",
        id: "log-2",
        scheduledAtUtc: "2026-09-06T00:00:00.000Z",
      }),
    ];

    expect(
      localDates({
        endDate: "2026-09-10",
        logs,
        schedule,
        startDate: "2026-09-01",
      })
    ).toEqual(["2026-09-01", "2026-09-06", "2026-09-10"]);
    expect(
      localDates({
        endDate: "2026-09-10",
        logs,
        schedule,
        startDate: "2026-09-05",
      })
    ).toEqual(["2026-09-06", "2026-09-10"]);
  });

  it("고정 기준은 실제 완료일이 늦어도 예정 흐름을 유지한다", () => {
    const schedule = scheduleFixture({
      intervalValue: 3,
      recurrenceType: "interval_days",
      startDateLocal: "2026-09-01",
    });
    const logs = [
      logFixture({
        actedAtUtc: "2026-09-03T03:00:00.000Z",
        scheduledAtUtc: "2026-09-01T00:00:00.000Z",
      }),
    ];

    expect(
      localDates({
        endDate: "2026-09-10",
        logs,
        schedule,
        startDate: "2026-09-01",
      })
    ).toEqual(["2026-09-01", "2026-09-04", "2026-09-07", "2026-09-10"]);
  });

  it("건너뛰기는 완료일 기준의 anchor를 옮기지 않는다", () => {
    const schedule = scheduleFixture({
      anchorType: "completion_based",
      intervalValue: 3,
      recurrenceType: "interval_days",
      startDateLocal: "2026-09-01",
    });

    expect(
      localDates({
        endDate: "2026-09-04",
        logs: [
          logFixture({
            action: "skipped",
            actedAtUtc: "2026-09-03T03:00:00.000Z",
            scheduledAtUtc: "2026-09-01T00:00:00.000Z",
          }),
        ],
        schedule,
        startDate: "2026-09-01",
      })
    ).toEqual(["2026-09-01", "2026-09-04"]);
  });
});

describe("occurrence 시간대와 종료일", () => {
  it("서울 당일은 알림 시각이 지나도 자정 전까지 scheduled다", () => {
    const timezone = "Asia/Seoul";
    const schedule = scheduleFixture({
      recurrenceType: "once",
      reminderTimeLocal: "00:30",
      startDateLocal: "2026-09-10",
      timezone,
    });
    const scheduledAtUtc = "2026-09-09T15:30:00.000Z";
    const beforeMidnight = createOccurrences({
      logs: [],
      now: new Date("2026-09-10T14:59:59.000Z"),
      schedules: [schedule],
      timezone,
    });
    const afterMidnight = createOccurrences({
      logs: [],
      now: new Date("2026-09-10T15:00:00.000Z"),
      schedules: [schedule],
      timezone,
    });

    expect(beforeMidnight.find(schedule.id, scheduledAtUtc)).toMatchObject({
      localDate: "2026-09-10",
      scheduledAtUtc,
      status: "scheduled",
    });
    expect(afterMidnight.find(schedule.id, scheduledAtUtc)?.status).toBe(
      "overdue"
    );
  });

  it("종료일 occurrence와 그 다음 날의 처리 기록을 보존한다", () => {
    const timezone = "Asia/Seoul";
    const schedule = scheduleFixture({
      endDateLocal: "2026-09-10",
      startDateLocal: "2026-09-09",
      timezone,
    });
    const logs = [
      logFixture({
        actedAtUtc: "2026-09-11T03:00:00.000Z",
        scheduledAtUtc: "2026-09-10T00:00:00.000Z",
      }),
    ];
    const entries = createOccurrences({
      logs,
      now: new Date("2026-09-11T03:00:00.000Z"),
      schedules: [schedule],
      timezone,
    }).range({
      endUtc: toUtcRange("2026-09-11", timezone).endUtc,
      startUtc: toUtcRange("2026-09-09", timezone).startUtc,
    });

    expect(
      entries.map(({ occurrence }) => [occurrence.localDate, occurrence.status])
    ).toEqual([
      ["2026-09-09", "overdue"],
      ["2026-09-10", "completed"],
    ]);
  });

  it("뉴욕 DST 전환에도 local 오전 9시를 유지한다", () => {
    const timezone = "America/New_York";
    const schedule = scheduleFixture({
      reminderTimeLocal: "09:00",
      startDateLocal: "2026-03-07",
      timezone,
    });
    const occurrences = createOccurrences({
      logs: [],
      now: new Date("2026-03-07T12:00:00.000Z"),
      schedules: [schedule],
      timezone,
    });

    expect(
      occurrences
        .range({
          endUtc: toUtcRange("2026-03-08", timezone).endUtc,
          startUtc: toUtcRange("2026-03-07", timezone).startUtc,
        })
        .map(({ occurrence }) => occurrence.scheduledAtUtc)
    ).toEqual(["2026-03-07T14:00:00.000Z", "2026-03-08T13:00:00.000Z"]);
  });
});
