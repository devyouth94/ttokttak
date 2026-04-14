import {
  buildCalendarDayEntries,
  buildCalendarDaySummaries,
  clampVisibleMonth,
  createCalendarMarkedDates,
  createCalendarScreenState,
  formatSelectedDateSectionTitle,
  formatVisibleMonthTitle,
  getMinimumVisibleMonth,
  shiftVisibleMonth,
} from "~/features/calendar-view/calendar-screen.helpers";
import type {
  CompletionLog,
  RecurringItem,
} from "~/features/recurring/domain/types";

const timezone = "Asia/Seoul";

function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    anchorType: "fixed",
    category: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    description: null,
    id: "item-1",
    intervalValue: null,
    isArchived: false,
    notificationsEnabled: true,
    recurrenceType: "once",
    reminderTimeLocal: "09:00",
    startDateLocal: "2026-04-10",
    timezone,
    title: "테스트 항목",
    updatedAt: "2026-04-01T00:00:00.000Z",
    userId: "user-1",
    weekdayMask: null,
    ...overrides,
  };
}

function createLog(overrides: Partial<CompletionLog> = {}): CompletionLog {
  return {
    actedAtUtc: "2026-04-12T01:05:00.000Z",
    action: "completed",
    createdAt: "2026-04-12T01:05:00.000Z",
    deviceId: null,
    id: "log-1",
    itemId: "item-1",
    scheduledAtUtc: "2026-04-12T00:00:00.000Z",
    userId: "user-1",
    ...overrides,
  };
}

describe("calendar-screen.helpers", () => {
  it("오늘 기준으로 선택 날짜와 보이는 월 상태를 만든다", () => {
    expect(
      createCalendarScreenState(new Date("2026-04-14T04:30:00.000Z"))
    ).toEqual({
      selectedDate: "2026-04-14",
      visibleMonth: "2026-04",
    });
  });

  it("보이는 월 제목을 한국어 형식으로 만든다", () => {
    expect(formatVisibleMonthTitle("2026-04")).toBe("2026년 4월");
  });

  it("선택 날짜 제목을 요일 포함 형식으로 만든다", () => {
    expect(formatSelectedDateSectionTitle("2026-04-16")).toBe(
      "4월 16일 목요일"
    );
  });

  it("월 이동 버튼은 같은 상태 규칙으로 이전과 다음 달을 계산한다", () => {
    expect(shiftVisibleMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftVisibleMonth("2026-12", 1)).toBe("2027-01");
  });

  it("가장 이른 시작일이 있는 달을 최소 보이는 월로 사용한다", () => {
    expect(
      getMinimumVisibleMonth([
        createItem({ id: "item-1", startDateLocal: "2026-04-10" }),
        createItem({ id: "item-2", startDateLocal: "2026-02-01" }),
        createItem({ id: "item-3", startDateLocal: "2026-03-15" }),
      ])
    ).toBe("2026-02");
    expect(getMinimumVisibleMonth([])).toBeNull();
  });

  it("보이는 월은 최소 보이는 월 아래로 내려가지 않는다", () => {
    expect(clampVisibleMonth("2026-01", "2026-02")).toBe("2026-02");
    expect(clampVisibleMonth("2026-03", "2026-02")).toBe("2026-03");
    expect(clampVisibleMonth("2026-03", null)).toBe("2026-03");
  });

  it("월 상태 도트는 일정별 상태를 최대 3개까지 보여주고 초과 개수를 따로 계산한다", () => {
    const daySummaries = buildCalendarDaySummaries({
      completionLogs: [
        createLog({
          action: "completed",
          id: "completed-log",
          itemId: "item-completed",
          scheduledAtUtc: "2026-04-12T00:00:00.000Z",
        }),
        createLog({
          action: "skipped",
          id: "skipped-log",
          itemId: "item-skipped",
          scheduledAtUtc: "2026-04-12T01:00:00.000Z",
        }),
      ],
      items: [
        createItem({
          id: "item-scheduled-1",
          reminderTimeLocal: "18:00",
          startDateLocal: "2026-04-12",
        }),
        createItem({
          id: "item-scheduled-2",
          reminderTimeLocal: "18:30",
          startDateLocal: "2026-04-12",
        }),
        createItem({
          id: "item-completed",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-12",
        }),
        createItem({
          id: "item-skipped",
          reminderTimeLocal: "10:00",
          startDateLocal: "2026-04-12",
        }),
        createItem({
          id: "item-overdue",
          reminderTimeLocal: "07:00",
          startDateLocal: "2026-04-12",
        }),
        createItem({
          id: "item-overdue-2",
          reminderTimeLocal: "07:30",
          startDateLocal: "2026-04-12",
        }),
      ],
      now: new Date("2026-04-13T00:30:00.000Z"),
      timezone,
      visibleMonth: "2026-04",
    });

    expect(daySummaries["2026-04-12"]).toEqual({
      hasEntries: true,
      localDate: "2026-04-12",
      markerStatuses: ["completed", "skipped", "overdue"],
      occurrenceCount: 6,
      overflowCount: 3,
    });
  });

  it("보이는 월은 local timezone 기준으로 계산한다", () => {
    const daySummaries = buildCalendarDaySummaries({
      completionLogs: [],
      items: [
        createItem({
          id: "item-1",
          reminderTimeLocal: "00:30",
          startDateLocal: "2026-05-01",
        }),
      ],
      now: new Date("2026-05-01T03:00:00.000Z"),
      timezone,
      visibleMonth: "2026-05",
    });

    expect(daySummaries["2026-05-01"]).toEqual({
      hasEntries: true,
      localDate: "2026-05-01",
      markerStatuses: ["scheduled"],
      occurrenceCount: 1,
      overflowCount: 0,
    });
  });

  it("markedDates는 선택 상태와 오늘 상태를 도트와 함께 유지한다", () => {
    const markedDates = createCalendarMarkedDates({
      daySummaries: {
        "2026-04-12": {
          hasEntries: true,
          localDate: "2026-04-12",
          markerStatuses: ["scheduled", "scheduled", "skipped"],
          occurrenceCount: 7,
          overflowCount: 4,
        },
      },
      selectedDate: "2026-04-12",
      todayDate: "2026-04-14",
    });

    expect(markedDates["2026-04-12"]).toMatchObject({
      marked: true,
      selected: true,
    });
    expect(markedDates["2026-04-12"]?.dots).toHaveLength(3);
    expect(markedDates["2026-04-14"]).toMatchObject({
      today: true,
    });
  });

  it("선택 날짜 리스트는 시간 오름차순으로 정렬한다", () => {
    const entries = buildCalendarDayEntries({
      completionLogs: [
        createLog({
          action: "completed",
          id: "completed-log",
          itemId: "item-completed",
          scheduledAtUtc: "2026-04-12T00:00:00.000Z",
        }),
        createLog({
          action: "skipped",
          id: "skipped-log",
          itemId: "item-skipped",
          scheduledAtUtc: "2026-04-12T01:00:00.000Z",
        }),
      ],
      items: [
        createItem({
          id: "item-scheduled-early",
          reminderTimeLocal: "08:00",
          startDateLocal: "2026-04-12",
          title: "예정 일정 A",
        }),
        createItem({
          id: "item-scheduled-late",
          reminderTimeLocal: "20:00",
          startDateLocal: "2026-04-12",
          title: "예정 일정 B",
        }),
        createItem({
          id: "item-completed",
          reminderTimeLocal: "09:00",
          startDateLocal: "2026-04-12",
          title: "완료 일정",
        }),
        createItem({
          id: "item-skipped",
          reminderTimeLocal: "10:00",
          startDateLocal: "2026-04-12",
          title: "건너뜀 일정",
        }),
      ],
      now: new Date("2026-04-12T00:30:00.000Z"),
      selectedDate: "2026-04-12",
      timezone,
    });

    expect(entries.map((entry) => entry.status)).toEqual([
      "scheduled",
      "completed",
      "skipped",
      "scheduled",
    ]);
    expect(entries.map((entry) => entry.statusLabel)).toEqual([
      "예정",
      "완료",
      "건너뜀",
      "예정",
    ]);
    expect(entries.map((entry) => entry.title)).toEqual([
      "예정 일정 A",
      "완료 일정",
      "건너뜀 일정",
      "예정 일정 B",
    ]);
  });
});
