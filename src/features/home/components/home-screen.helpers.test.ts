import { getFeedItemMetaLine } from "~/features/home/components/home-feed-item-row";
import {
  buildHomeFeedSections,
  createHomeDateOptions,
  getOverdueOccurrencesToResolve,
} from "~/features/home/components/home-screen.helpers";
import type {
  CompletionLog,
  RecurringItem,
  RecurringItemScheduleVersion,
} from "~/features/recurring/domain/types";

const timezone = "Asia/Seoul";

function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    anchorType: "fixed",
    category: null,
    colorKey: "blue",
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
    seedStartDateLocal: "2026-04-10",
    notificationsEnabled: true,
    createdAt: "2026-04-01T00:00:00.000Z",
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
          title: "지난 영양제",
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
      "지난 일정",
      "오늘",
      "다가오는 일정",
    ]);
    expect(sections[0]?.items[0]?.item.title).toBe("지난 영양제");
    expect(sections[0]?.items[0]?.metaLabel).toBe("2일 지남");
    expect(sections[1]?.items[0]?.item.title).toBe("오늘 운동");
    expect(sections[1]?.items[0]?.metaLabel).toBe("오후 6:00");
    expect(sections[2]?.items[0]?.item.title).toBe("다가오는 필터 교체");
    expect(sections[2]?.items[0]?.dateSeparatorLabel).toBe("4월 13일");
    expect(sections[2]?.items[0]?.metaLabel).toBe("오전 9:00");
  });

  it("지난 일정 row meta는 지난 날짜와 알림 시간 사이에 점을 넣는다", () => {
    const sections = buildHomeFeedSections({
      completionLogs: [],
      items: [
        createItem({
          id: "overdue-item",
          startDateLocal: "2026-04-08",
          title: "지난 영양제",
        }),
      ],
      now: new Date("2026-04-10T03:00:00.000Z"),
      selectedDateId: "2026-04-10",
      timezone,
    });

    const overdueCard = sections.find((section) => section.id === "overdue")
      ?.items[0];

    expect(overdueCard).toBeDefined();
    expect(getFeedItemMetaLine(overdueCard!)).toBe(
      "2일 지남 · 오전 9:00 · 한 번"
    );
  });

  it("지난 일정은 오늘 이전 날짜 중 같은 항목당 최신 overdue 1개만 노출한다", () => {
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

  it("다가오는 일정은 14일 안의 일정을 10개 제한 없이 노출한다", () => {
    const items = Array.from({ length: 15 }, (_, index) =>
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

    expect(upcomingSection?.caption).toBe(
      "홈에서는 앞으로 14일간의 일정만 보여요"
    );
    expect(upcomingSection?.items).toHaveLength(14);
    expect(upcomingSection?.items[0]?.item.title).toBe("다가오는 일정 1");
    expect(upcomingSection?.items[0]?.dateSeparatorLabel).toBe("내일");
    expect(upcomingSection?.items[0]?.metaLabel).toBe("오전 9:00");
    expect(upcomingSection?.items[13]?.item.title).toBe("다가오는 일정 14");
    expect(upcomingSection?.items[13]?.dateSeparatorLabel).toBe("4월 24일");
  });

  it("지난 일정 액션 대상에는 해당 카드 이전 overdue도 함께 포함한다", () => {
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

  it("수정된 version이 있으면 홈 섹션도 미래 occurrence만 새 규칙으로 보여준다", () => {
    const sections = buildHomeFeedSections({
      completionLogs: [],
      items: [
        createItem({
          id: "edited-item",
          intervalValue: 3,
          recurrenceType: "interval_days",
          scheduleVersions: [
            createVersion({
              id: "version-1",
              intervalValue: 3,
              itemId: "edited-item",
              recurrenceType: "interval_days",
              seedStartDateLocal: "2026-04-10",
            }),
            createVersion({
              effectiveFromUtc: "2026-04-14T01:00:00.000Z",
              id: "version-2",
              intervalValue: 4,
              itemId: "edited-item",
              recurrenceType: "interval_days",
              seedStartDateLocal: "2026-04-17",
            }),
          ],
          startDateLocal: "2026-04-10",
          title: "수정된 일정",
        }),
      ],
      now: new Date("2026-04-14T03:00:00.000Z"),
      selectedDateId: "2026-04-14",
      timezone,
    });

    const upcomingSection = sections.find(
      (section) => section.id === "upcoming"
    );

    expect(upcomingSection?.items[0]?.occurrence.localDate).toBe("2026-04-17");
  });
});
