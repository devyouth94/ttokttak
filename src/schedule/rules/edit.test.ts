import { resolveEdit } from "./edit";
import {
  scheduleFixture,
  type ScheduleOverrides,
  testTimezone as timezone,
} from "../fixtures";
import type { Schedule } from "../schedule";

const now = new Date("2026-05-07T03:00:00.000Z");

describe("resolveEdit", () => {
  it("규칙이 바뀌면 수정 시점부터 적용할 규칙 버전을 만든다", () => {
    const edit = resolveEdit({
      completionLogs: [],
      input: { reminderTimeLocal: "21:00" },
      item: createItem(),
      now,
      timezone,
    });

    expect(edit?.version).toEqual({
      anchorType: "fixed",
      effectiveFromUtc: now.toISOString(),
      endDateLocal: null,
      intervalValue: null,
      notificationsEnabled: true,
      recurrenceType: "daily",
      reminderTimeLocal: "21:00",
      seedStartDateLocal: "2026-05-07",
      weekdayMask: null,
    });
  });

  it("종료된 일정도 내용만 수정하면 규칙 버전을 만들지 않는다", () => {
    expect(
      resolveEdit({
        completionLogs: [],
        input: { title: "종료된 물 마시기" },
        item: createItem({ endDateLocal: "2026-05-06" }),
        now,
        timezone,
      })
    ).toEqual({
      item: {
        colorHex: "#9DB7F5",
        description: null,
        title: "종료된 물 마시기",
      },
      version: null,
    });
  });

  it("변경된 값이 없으면 수정 결과를 만들지 않는다", () => {
    expect(
      resolveEdit({
        completionLogs: [],
        input: {},
        item: createItem(),
        now,
        timezone,
      })
    ).toBeNull();
  });

  it("종료일은 수정하는 날보다 빠를 수 없다", () => {
    expect(() =>
      resolveEdit({
        completionLogs: [],
        input: { endDateLocal: "2026-05-06" },
        item: createItem(),
        now,
        timezone,
      })
    ).toThrow("종료일은 수정하는 날보다 빠를 수 없습니다.");
  });

  it("과거 종료일 제거는 다음 future occurrence부터 적용한다", () => {
    expect(
      resolveEdit({
        completionLogs: [],
        input: { endDateLocal: null },
        item: createItem({ endDateLocal: "2026-05-06" }),
        now,
        timezone,
      })?.version
    ).toEqual(
      expect.objectContaining({
        endDateLocal: null,
        recurrenceType: "daily",
        seedStartDateLocal: "2026-05-08",
      })
    );
  });

  it("한 번 일정으로 바꾸면 종료일을 제거한다", () => {
    expect(
      resolveEdit({
        completionLogs: [],
        input: { recurrenceType: "once" },
        item: createItem({ endDateLocal: "2026-05-19" }),
        now,
        timezone,
      })?.version
    ).toEqual(
      expect.objectContaining({
        endDateLocal: null,
        recurrenceType: "once",
      })
    );
  });
});

function createItem(overrides: ScheduleOverrides = {}): Schedule {
  return scheduleFixture({
    createdAt: "2026-05-01T00:00:00.000Z",
    startDateLocal: "2026-05-01",
    title: "물 마시기",
    ...overrides,
  });
}
