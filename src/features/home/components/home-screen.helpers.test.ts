import {
  buildHomeFeedSections,
  createHomeDateOptions,
  getOverdueOccurrencesToResolve,
} from "~/features/home/components/home-screen.helpers";
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

describe("buildHomeFeedSections", () => {
  it("날짜 캐러셀은 오늘 포함 이후 14일까지만 만든다", () => {
    const options = createHomeDateOptions(new Date("2026-04-10T03:00:00.000Z"));

    expect(options).toHaveLength(15);
    expect(options[0]?.id).toBe("2026-04-10");
    expect(options[14]?.id).toBe("2026-04-24");
  });

  it("오늘 선택 시 overdue, 오늘, upcoming 순서로 섹션을 만든다", () => {
    const sections = buildHomeFeedSections({
      completionLogs: [],
      items: [
        createItem({
          id: "overdue-item",
          startDateLocal: "2026-04-08",
          title: "놓친 영양제",
        }),
        createItem({
          id: "today-item",
          reminderTimeLocal: "18:00",
          title: "오늘 운동",
        }),
        createItem({
          id: "upcoming-item",
          startDateLocal: "2026-04-13",
          title: "다가오는 필터 교체",
        }),
      ],
      now: new Date("2026-04-10T03:00:00.000Z"),
      selectedDateId: "2026-04-10",
      timezone,
    });

    expect(sections.map((section) => section.title)).toEqual([
      "놓친 일정",
      "오늘",
      "다가오는 일정",
    ]);
    expect(sections[0]?.items[0]?.item.title).toBe("놓친 영양제");
    expect(sections[0]?.items[0]?.metaLabel).toBe("2일 지남");
    expect(sections[1]?.items[0]?.item.title).toBe("오늘 운동");
    expect(sections[1]?.items[0]?.metaLabel).toBe("오후 6:00");
    expect(sections[2]?.items[0]?.item.title).toBe("다가오는 필터 교체");
    expect(sections[2]?.items[0]?.metaLabel).toBe("3일 후");
  });

  it("놓친 일정은 오늘 이전 날짜 중 같은 항목당 최신 overdue 1개만 노출한다", () => {
    const sections = buildHomeFeedSections({
      completionLogs: [],
      items: [
        createItem({
          id: "interval-overdue-item",
          intervalValue: 3,
          recurrenceType: "interval_days",
          startDateLocal: "2026-04-04",
          title: "치약 교체",
        }),
      ],
      now: new Date("2026-04-10T03:00:00.000Z"),
      selectedDateId: "2026-04-10",
      timezone,
    });

    const overdueSection = sections.find((section) => section.id === "overdue");

    expect(overdueSection?.items).toHaveLength(1);
    expect(overdueSection?.items[0]?.item.title).toBe("치약 교체");
    expect(overdueSection?.items[0]?.metaLabel).toBe("3일 지남");
  });

  it("오늘이 아닌 날짜를 선택하면 해당 날짜 섹션만 만든다", () => {
    const sections = buildHomeFeedSections({
      completionLogs: [
        createLog({
          itemId: "selected-item",
          scheduledAtUtc: "2026-04-12T00:00:00.000Z",
        }),
      ],
      items: [
        createItem({
          id: "selected-item",
          recurrenceType: "daily",
          startDateLocal: "2026-04-10",
          title: "복용 체크",
        }),
      ],
      now: new Date("2026-04-10T03:00:00.000Z"),
      selectedDateId: "2026-04-13",
      timezone,
    });

    expect(sections).toHaveLength(1);
    expect(sections[0]?.title).toBe("4월 13일");
    expect(sections[0]?.items).toHaveLength(1);
    expect(sections[0]?.items[0]?.item.title).toBe("복용 체크");
  });

  it("다가오는 일정은 최대 10개까지만 노출한다", () => {
    const items = Array.from({ length: 12 }, (_, index) =>
      createItem({
        id: `upcoming-item-${index + 1}`,
        startDateLocal: `2026-04-${String(index + 11).padStart(2, "0")}`,
        title: `다가오는 일정 ${index + 1}`,
      })
    );

    const sections = buildHomeFeedSections({
      completionLogs: [],
      items,
      now: new Date("2026-04-10T03:00:00.000Z"),
      selectedDateId: "2026-04-10",
      timezone,
    });

    const upcomingSection = sections.find(
      (section) => section.id === "upcoming"
    );

    expect(upcomingSection?.items).toHaveLength(10);
    expect(upcomingSection?.items[0]?.item.title).toBe("다가오는 일정 1");
    expect(upcomingSection?.items[9]?.item.title).toBe("다가오는 일정 10");
  });

  it("놓친 일정 액션 대상에는 해당 카드 이전 overdue도 함께 포함한다", () => {
    const sections = buildHomeFeedSections({
      completionLogs: [],
      items: [
        createItem({
          id: "interval-overdue-item",
          intervalValue: 3,
          recurrenceType: "interval_days",
          startDateLocal: "2026-04-04",
          title: "치약 교체",
        }),
      ],
      now: new Date("2026-04-10T03:00:00.000Z"),
      selectedDateId: "2026-04-10",
      timezone,
    });

    const overdueCard = sections.find((section) => section.id === "overdue")
      ?.items[0];

    expect(overdueCard).toBeDefined();

    const occurrencesToResolve = getOverdueOccurrencesToResolve({
      card: overdueCard!,
      completionLogs: [],
      now: new Date("2026-04-10T03:00:00.000Z"),
      timezone,
    });

    expect(
      occurrencesToResolve.map((occurrence) => occurrence.localDate)
    ).toEqual(["2026-04-04", "2026-04-07"]);
  });
});
