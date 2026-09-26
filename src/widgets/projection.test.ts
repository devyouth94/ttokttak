import type { TFunction } from "i18next";

import {
  ruleFixture,
  scheduleFixture,
  type ScheduleOverrides,
  testTimezone,
} from "~/schedule/fixtures";

import { createHomeWidgetProps } from "./projection";

const t = ((key: string, options?: { count?: number }) =>
  key === "home.widget.more" ? `+${options?.count}개` : key) as TFunction;

it("지난 일정 다음 오늘 occurrence를 크기별 최대 개수와 숨긴 개수로 만든다", () => {
  const overdue = [6, 7, 8, 9].map((day) =>
    item({
      id: `overdue-${day}`,
      startDateLocal: `2026-04-0${day}`,
      title: `지난 ${day}`,
    })
  );
  const today = [8, 9, 10, 11].map((hour) =>
    item({
      id: `today-${hour}`,
      reminderTimeLocal: `${String(hour).padStart(2, "0")}:00`,
      title: `오늘 ${hour}`,
    })
  );

  const props = createHomeWidgetProps({
    language: "ko",
    logs: [],
    now: new Date("2026-04-10T03:00:00.000Z"),
    schedules: [...today, ...overdue],
    t,
    timezone: testTimezone,
  });

  expect(props.items.map((item) => item.title)).toEqual([
    "지난 9",
    "지난 8",
    "지난 7",
    "지난 6",
    "오늘 8",
    "오늘 9",
  ]);
  expect(props.moreSmall).toBe("+5개");
  expect(props.moreMedium).toBe("+2개");
});

it("지난 occurrence는 최신 규칙이 아닌 실제 예정 시각을 표시한다", () => {
  const props = createHomeWidgetProps({
    language: "ko",
    logs: [],
    now: new Date("2026-09-26T06:00:00.000Z"),
    schedules: [
      item({
        startDateLocal: "2026-09-25",
        versions: [
          ruleFixture({
            effectiveFromUtc: "2026-09-24T15:00:00.000Z",
            reminderTimeLocal: "09:00",
            seedStartDateLocal: "2026-09-25",
          }),
          ruleFixture({
            effectiveFromUtc: "2026-09-26T03:00:00.000Z",
            reminderTimeLocal: "21:00",
            seedStartDateLocal: "2026-09-26",
          }),
        ],
      }),
    ],
    t,
    timezone: testTimezone,
  });

  expect(props.items[0]?.detail).toContain("오전 9:00");
});

function item(overrides: ScheduleOverrides) {
  return scheduleFixture({
    recurrenceType: "once",
    title: "테스트 일정",
    ...overrides,
  });
}
