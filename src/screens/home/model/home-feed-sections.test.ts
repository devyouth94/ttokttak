import { addDays, format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import {
  logFixture,
  ruleFixture,
  scheduleFixture,
  type ScheduleOverrides,
  testTimezone as timezone,
} from "~/schedule/fixtures";
import type { OccurrenceLog } from "~/schedule/rules/occurrence";
import { createOccurrences, toUtcRange } from "~/schedule/rules/occurrence";
import type { RuleVersion } from "~/schedule/rules/recurrence";
import type { Schedule } from "~/schedule/schedule";

import {
  buildHomeFeedSections as buildHomeFeedViewSections,
  createHomeDateOptions,
} from "./home-feed-sections";
import { getFeedItemMetaLine } from "../ui/home-feed-item-row";

function createItem(overrides: ScheduleOverrides = {}): Schedule {
  return scheduleFixture({
    ...(overrides.versions ? {} : { recurrenceType: "once" }),
    title: "테스트 항목",
    ...overrides,
  });
}

function createLog(overrides: Partial<OccurrenceLog> = {}): OccurrenceLog {
  return logFixture({
    actedAtUtc: "2026-04-12T01:05:00.000Z",
    scheduledAtUtc: "2026-04-12T00:00:00.000Z",
    ...overrides,
  });
}

function createVersion(overrides: Partial<RuleVersion> = {}): RuleVersion {
  return ruleFixture({
    seedStartDateLocal: "2026-04-10",
    ...overrides,
  });
}

function buildHomeFeedSections({
  completionLogs,
  items,
  language,
  now,
  selectedDateId,
  timezone,
}: {
  completionLogs: OccurrenceLog[];
  items: Schedule[];
  language: "en" | "ko";
  now: Date;
  selectedDateId: string;
  timezone: string;
}) {
  const today = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const isToday = selectedDateId === today;
  const addLocalDays = (localDate: string, amount: number) =>
    format(
      addDays(parse(localDate, "yyyy-MM-dd", new Date()), amount),
      "yyyy-MM-dd"
    );
  const occurrences = createOccurrences({
    logs: completionLogs,
    now,
    schedules: items,
    timezone,
  });
  const overdueEntries = occurrences
    .range(
      {
        endUtc: now.toISOString(),
        startUtc: toUtcRange(addLocalDays(today, -730), timezone).startUtc,
      },
      "overdue"
    )
    .sort((left, right) =>
      right.occurrence.scheduledAtUtc.localeCompare(
        left.occurrence.scheduledAtUtc
      )
    )
    .filter(
      (entry, index, entries) =>
        entries.findIndex(
          ({ schedule }) => schedule.id === entry.schedule.id
        ) === index
    );

  return buildHomeFeedViewSections({
    language,
    now,
    overdueEntries,
    selectedDateEntries: occurrences.range(
      toUtcRange(selectedDateId, timezone),
      "scheduled"
    ),
    selectedDateId,
    timezone,
    upcomingEntries: isToday
      ? occurrences.range(
          {
            endUtc: toUtcRange(addLocalDays(today, 14), timezone).endUtc,
            startUtc: toUtcRange(addLocalDays(today, 1), timezone).startUtc,
          },
          "scheduled"
        )
      : [],
  });
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
      language: "ko",
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

  it("English 표시 언어에서는 홈 섹션과 날짜/시간 문구를 English로 만든다", () => {
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
      language: "en",
      now: new Date("2026-04-10T03:00:00.000Z"),
      selectedDateId: "2026-04-10",
      timezone,
    });

    expect(sections.map((section) => section.title)).toEqual([
      "Overdue",
      "Today",
      "Upcoming",
    ]);
    expect(sections[0]?.emptyMessage).toBe("No overdue items");
    expect(sections[1]?.emptyMessage).toBe("Nothing scheduled for today");
    expect(sections[2]?.caption).toBe("Home shows items for the next 14 days");
    expect(sections[0]?.items[0]?.item.title).toBe("지난 영양제");
    expect(sections[0]?.items[0]?.metaLabel).toBe("2 days overdue");
    expect(sections[0]?.items[0]?.recurrenceLabel).toBe("Once");
    expect(sections[1]?.items[0]?.metaLabel).toBe("6:00 PM");
    expect(sections[2]?.items[0]?.dateSeparatorLabel).toBe("Apr 13");
    expect(sections[2]?.items[0]?.metaLabel).toBe("9:00 AM");
  });

  it("지난 일정 row meta는 지난 날짜와 알림 시간 사이에 점을 넣는다", () => {
    const sections = buildHomeFeedSections({
      language: "ko",
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
      language: "ko",
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
      language: "ko",
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

  it("English 표시 언어에서는 날짜 캐러셀 라벨을 English로 만든다", () => {
    const options = createHomeDateOptions(
      new Date("2026-04-10T03:00:00.000Z"),
      "en"
    );

    expect(options[0]).toMatchObject({
      dayLabel: "Fri",
      id: "2026-04-10",
      title: "Today",
      value: "10",
    });
    expect(options[1]).toMatchObject({
      dayLabel: "Sat",
      id: "2026-04-11",
      title: "Apr 11",
      value: "11",
    });
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
      language: "ko",
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

  it("수정된 version이 있으면 홈 섹션도 미래 occurrence만 새 규칙으로 보여준다", () => {
    const sections = buildHomeFeedSections({
      language: "ko",
      completionLogs: [],
      items: [
        createItem({
          id: "edited-item",
          versions: [
            createVersion({
              intervalValue: 3,
              recurrenceType: "interval_days",
              seedStartDateLocal: "2026-04-10",
            }),
            createVersion({
              effectiveFromUtc: "2026-04-14T01:00:00.000Z",
              intervalValue: 4,
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
