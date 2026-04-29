import type { RecurringItem } from "~/features/recurring/domain/types";

import {
  buildReminderListEntries,
  formatReminderListNextOccurrenceLabel,
} from "./reminder-list.helpers";

describe("reminder-list helpers", () => {
  it("내일 반복 일정의 다음 예정 시간을 표시한다", () => {
    expect(
      formatReminderListNextOccurrenceLabel(
        "2026-04-23T00:00:00.000Z",
        new Date("2026-04-22T03:00:00.000Z"),
        "Asia/Seoul"
      )
    ).toBe("내일 오전 9:00");
  });

  it("오늘이고 아직 미래인 반복 예정일은 오늘로 표시한다", () => {
    expect(
      formatReminderListNextOccurrenceLabel(
        "2026-04-22T00:00:00.000Z",
        new Date("2026-04-21T23:00:00.000Z"),
        "Asia/Seoul"
      )
    ).toBe("오늘 오전 9:00");
  });

  it("14일 이내 반복 예정일은 며칠 후와 시간을 표시한다", () => {
    expect(
      formatReminderListNextOccurrenceLabel(
        "2026-04-25T00:00:00.000Z",
        new Date("2026-04-22T03:00:00.000Z"),
        "Asia/Seoul"
      )
    ).toBe("3일 후 오전 9:00");
  });

  it("15일 이후 반복 예정일은 날짜와 시간을 표시한다", () => {
    expect(
      formatReminderListNextOccurrenceLabel(
        "2026-05-11T23:00:00.000Z",
        new Date("2026-04-22T03:00:00.000Z"),
        "Asia/Seoul"
      )
    ).toBe("5월 12일 오전 8:00");
  });

  it("한 번 일정도 날짜와 시간을 표시한다", () => {
    expect(
      formatReminderListNextOccurrenceLabel(
        "2026-05-11T23:00:00.000Z",
        new Date("2026-04-22T03:00:00.000Z"),
        "Asia/Seoul"
      )
    ).toBe("5월 12일 오전 8:00");
  });

  it("오늘 시간이 지난 반복 일정은 다음 발생을 표시한다", () => {
    const entries = buildReminderListEntries({
      completionLogs: [],
      items: [
        createRecurringItem({
          id: "daily",
          recurrenceType: "daily",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-22",
          title: "매일 일정",
        }),
      ],
      now: new Date("2026-04-22T03:00:00.000Z"),
      timezone: "Asia/Seoul",
    });

    expect(entries[0]?.nextOccurrenceLabel).toBe("내일 오전 9:00");
  });

  it("다음 예정일 빠른순에서는 다음 예정이 없는 일정을 목록 아래로 보낸다", () => {
    const entries = buildReminderListEntries({
      completionLogs: [],
      items: [
        createRecurringItem({
          id: "past-once",
          recurrenceType: "once",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-22",
          title: "지난 한 번",
        }),
        createRecurringItem({
          id: "daily",
          recurrenceType: "daily",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-22",
          title: "매일 일정",
        }),
      ],
      now: new Date("2026-04-22T03:00:00.000Z"),
      timezone: "Asia/Seoul",
    });

    expect(entries.map((entry) => entry.id)).toEqual(["daily", "past-once"]);
    expect(entries[1]?.nextOccurrenceLabel).toBe("예정 없음");
  });

  it("기본 정렬은 다음 예정일 빠른순이다", () => {
    const entries = buildReminderListEntries({
      completionLogs: [],
      items: [
        createRecurringItem({
          createdAt: "2026-04-20T00:00:00.000Z",
          id: "late",
          reminderTimeLocal: "12:00",
          title: "늦은 일정",
        }),
        createRecurringItem({
          createdAt: "2026-04-21T00:00:00.000Z",
          id: "early",
          reminderTimeLocal: "10:00",
          title: "빠른 일정",
        }),
      ],
      now: new Date("2026-04-22T00:00:00.000Z"),
      timezone: "Asia/Seoul",
    });

    expect(entries.map((entry) => entry.id)).toEqual(["early", "late"]);
  });

  it("최근 생성순에서는 다음 예정이 없어도 생성일 기준으로 정렬한다", () => {
    const entries = buildReminderListEntries({
      completionLogs: [],
      items: [
        createRecurringItem({
          createdAt: "2026-04-20T00:00:00.000Z",
          id: "daily",
          title: "먼저 만든 일정",
        }),
        createRecurringItem({
          createdAt: "2026-04-21T00:00:00.000Z",
          id: "past-once",
          recurrenceType: "once",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-21",
          title: "나중에 만든 일정",
        }),
      ],
      now: new Date("2026-04-22T00:00:00.000Z"),
      sortMode: "createdDesc",
      timezone: "Asia/Seoul",
    });

    expect(entries.map((entry) => entry.id)).toEqual(["past-once", "daily"]);
  });

  it("제목순으로 정렬한다", () => {
    const entries = buildReminderListEntries({
      completionLogs: [],
      items: [
        createRecurringItem({
          id: "beta",
          title: "청소",
        }),
        createRecurringItem({
          id: "alpha",
          title: "물 마시기",
        }),
      ],
      now: new Date("2026-04-22T00:00:00.000Z"),
      sortMode: "titleAsc",
      timezone: "Asia/Seoul",
    });

    expect(entries.map((entry) => entry.id)).toEqual(["alpha", "beta"]);
  });

  it("다음 예정일 빠른순으로 정렬한다", () => {
    const entries = buildReminderListEntries({
      completionLogs: [],
      items: [
        createRecurringItem({
          id: "late",
          reminderTimeLocal: "12:00",
          title: "늦은 일정",
        }),
        createRecurringItem({
          id: "early",
          reminderTimeLocal: "10:00",
          title: "빠른 일정",
        }),
      ],
      now: new Date("2026-04-22T00:00:00.000Z"),
      sortMode: "nextAsc",
      timezone: "Asia/Seoul",
    });

    expect(entries.map((entry) => entry.id)).toEqual(["early", "late"]);
  });

  it("제목순에서는 다음 예정이 없어도 제목 기준으로 정렬한다", () => {
    const entries = buildReminderListEntries({
      completionLogs: [],
      items: [
        createRecurringItem({
          id: "past-once",
          recurrenceType: "once",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-22",
          title: "가장 앞 제목",
        }),
        createRecurringItem({
          id: "daily",
          recurrenceType: "daily",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-22",
          title: "하루 일정",
        }),
      ],
      now: new Date("2026-04-22T03:00:00.000Z"),
      sortMode: "titleAsc",
      timezone: "Asia/Seoul",
    });

    expect(entries.map((entry) => entry.id)).toEqual(["past-once", "daily"]);
  });
});

function createRecurringItem(
  overrides: Partial<RecurringItem> & Pick<RecurringItem, "id" | "title">
): RecurringItem {
  const { id, title, ...rest } = overrides;

  return {
    anchorType: "fixed",
    category: null,
    createdAt: "2026-04-20T00:00:00.000Z",
    description: null,
    id,
    intervalValue: null,
    isArchived: false,
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: "09:00",
    startDateLocal: "2026-04-22",
    timezone: "Asia/Seoul",
    title,
    updatedAt: "2026-04-20T00:00:00.000Z",
    userId: "user-1",
    weekdayMask: null,
    ...rest,
  };
}
