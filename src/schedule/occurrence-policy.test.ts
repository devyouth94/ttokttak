import { logFixture, scheduleFixture } from "./fixtures";
import { countPendingAtTimes } from "./occurrence-policy";

const timezone = "Asia/Seoul";

it("기준 시각마다 지난 일정과 오늘 도래한 occurrence만 센다", () => {
  const schedules = [
    scheduleFixture({ id: "A", startDateLocal: "2026-09-07" }),
    scheduleFixture({
      id: "B",
      recurrenceType: "once",
      reminderTimeLocal: "13:00",
      startDateLocal: "2026-09-10",
    }),
    scheduleFixture({
      id: "C",
      notificationsEnabled: false,
      recurrenceType: "once",
      reminderTimeLocal: "11:00",
      startDateLocal: "2026-09-10",
    }),
    scheduleFixture({
      id: "archived",
      isArchived: true,
      startDateLocal: "2026-09-09",
    }),
    scheduleFixture({
      id: "handled",
      recurrenceType: "once",
      reminderTimeLocal: "10:00",
      startDateLocal: "2026-09-10",
    }),
  ];
  const logs = [
    logFixture({
      itemId: "handled",
      scheduledAtUtc: "2026-09-10T01:00:00.000Z",
    }),
  ];
  const noon = new Date("2026-09-10T03:00:00.000Z");
  const one = new Date("2026-09-10T04:00:00.000Z");

  expect([
    ...countPendingAtTimes({
      logs,
      schedules,
      times: [noon, one],
      timezone,
    }).values(),
  ]).toEqual([3, 4]);
});

it("정확히 730일 전은 포함하고 그보다 이전은 제외한다", () => {
  const time = new Date("2026-09-10T03:00:00.000Z");
  const counts = countPendingAtTimes({
    logs: [],
    schedules: [
      scheduleFixture({
        id: "boundary",
        notificationsEnabled: false,
        recurrenceType: "once",
        startDateLocal: "2024-09-10",
      }),
      scheduleFixture({
        id: "outside",
        notificationsEnabled: false,
        recurrenceType: "once",
        startDateLocal: "2024-09-09",
      }),
    ],
    times: [time],
    timezone,
  });

  expect(counts.get(time.toISOString())).toBe(1);
});
