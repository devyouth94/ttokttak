import type { TFunction } from "i18next";

import {
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

function item(overrides: ScheduleOverrides) {
  return scheduleFixture({
    recurrenceType: "once",
    title: "테스트 일정",
    ...overrides,
  });
}
