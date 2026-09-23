import type { TFunction } from "i18next";

import {
  logFixture,
  scheduleFixture,
  type ScheduleOverrides,
  testTimezone as timezone,
} from "./fixtures";
import { createHomeSections, getHomeQueryRange } from "./home-feed";

const defaults = {
  language: "ko" as const,
  logs: [],
  now: new Date("2026-04-10T03:00:00.000Z"),
  selectedDateId: "2026-04-10",
  t: ((key: string) => key) as TFunction,
  timezone,
};

describe("홈 피드 계산", () => {
  it("오늘은 지난 730일부터 다가오는 14일까지 세 섹션을 만든다", () => {
    const sections = createHomeSections({
      ...defaults,
      schedules: [
        item({
          id: "overdue-item",
          startDateLocal: "2026-04-08",
          title: "지난 영양제",
        }),
        item({
          id: "today-item",
          reminderTimeLocal: "18:00",
          title: "오늘 운동",
        }),
        item({
          id: "upcoming-item",
          startDateLocal: "2026-04-13",
          title: "다가오는 필터 교체",
        }),
      ],
    });

    expect(getHomeQueryRange(defaults)).toEqual({
      endLocalDate: "2026-04-24",
      startLocalDate: "2024-04-10",
    });
    expect(sections.map((section) => section.title)).toEqual([
      "home.feed.sectionOverdue",
      "home.feed.sectionToday",
      "home.feed.sectionUpcoming",
    ]);
    expect(sections[0]?.items[0]).toMatchObject({
      dateSeparatorLabel: null,
      metaLine: "home.feed.overdueDays · 오전 9:00 · 한 번",
    });
    expect(sections[1]?.items[0]?.metaLine).toBe("오후 6:00 · 한 번");
    expect(sections[2]?.items[0]).toMatchObject({
      dateSeparatorLabel: "4월 13일",
      metaLine: "오전 9:00 · 한 번",
    });
  });

  it("다른 날짜는 선택한 하루와 해당 섹션만 만든다", () => {
    const sections = createHomeSections({
      ...defaults,
      schedules: [
        item({
          id: "selected-item",
          recurrenceType: "daily",
          startDateLocal: "2026-04-10",
          title: "복용 체크",
        }),
      ],
      logs: [
        logFixture({
          itemId: "selected-item",
          scheduledAtUtc: "2026-04-12T00:00:00.000Z",
        }),
      ],
      selectedDateId: "2026-04-13",
    });

    expect(
      getHomeQueryRange({ ...defaults, selectedDateId: "2026-04-13" })
    ).toEqual({
      endLocalDate: "2026-04-13",
      startLocalDate: "2026-04-13",
    });
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      title: "4월 13일",
      items: [{ item: { title: "복용 체크" } }],
    });
  });

  it("English 날짜·시간을 만든다", () => {
    const sections = createHomeSections({
      ...defaults,
      schedules: [
        item({
          id: "overdue-item",
          startDateLocal: "2026-04-08",
          title: "지난 영양제",
        }),
        item({
          id: "today-item",
          reminderTimeLocal: "18:00",
          title: "오늘 운동",
        }),
        item({
          id: "upcoming-item",
          startDateLocal: "2026-04-13",
          title: "다가오는 필터 교체",
        }),
      ],
      language: "en",
    });

    expect(sections.map((section) => section.title)).toEqual([
      "home.feed.sectionOverdue",
      "home.feed.sectionToday",
      "home.feed.sectionUpcoming",
    ]);
    expect(sections[0]?.items[0]?.metaLine).toBe(
      "home.feed.overdueDays · 9:00 AM · Once"
    );
    expect(sections[1]?.items[0]?.metaLine).toBe("6:00 PM · Once");
    expect(sections[2]).toMatchObject({
      caption: "home.feed.upcomingCaption",
      emptyMessage: "home.feed.emptyUpcoming",
    });
  });

  it("지난 일정은 일정별 최신 occurrence 하나만 노출한다", () => {
    const sections = createHomeSections({
      ...defaults,
      schedules: [
        item({
          id: "interval-overdue-item",
          intervalValue: 3,
          recurrenceType: "interval_days",
          startDateLocal: "2026-04-04",
          title: "치약 교체",
        }),
      ],
    });

    expect(sections[0]?.items).toHaveLength(1);
    expect(sections[0]?.items[0]).toMatchObject({
      item: { title: "치약 교체" },
      id: "interval-overdue-item:2026-04-07T00:00:00.000Z",
      compactMetaLine: "home.feed.overdueDays · 오전 9:00",
      metaLine: "home.feed.overdueDays · 오전 9:00 · 3일마다",
    });
  });

  it("다가오는 일정은 14일 범위 안에서 개수 제한 없이 노출한다", () => {
    const sections = createHomeSections({
      ...defaults,
      schedules: Array.from({ length: 15 }, (_, index) =>
        item({
          id: `upcoming-item-${index + 1}`,
          startDateLocal: `2026-04-${String(index + 11).padStart(2, "0")}`,
          title: `다가오는 일정 ${index + 1}`,
        })
      ),
    });
    const upcoming = sections[2];

    expect(upcoming?.items).toHaveLength(14);
    expect(upcoming?.items[0]?.dateSeparatorLabel).toBe("home.feed.tomorrow");
    expect(upcoming?.items[13]?.dateSeparatorLabel).toBe("4월 24일");
  });

  it("profile 시간대의 오늘 경계로 조회 범위와 오늘 카드를 만든다", () => {
    const input = { ...defaults, now: new Date("2026-04-09T15:00:00.000Z") };
    expect(getHomeQueryRange(input)).toEqual({
      startLocalDate: "2024-04-10",
      endLocalDate: "2026-04-24",
    });
    const sections = createHomeSections({
      ...input,
      schedules: [item({ reminderTimeLocal: "00:00" })],
    });
    expect(sections[0]?.items).toEqual([]);
    expect(sections[1]?.items[0]?.id).toBe("item-1:2026-04-09T15:00:00.000Z");
  });
});

function item(overrides: ScheduleOverrides = {}) {
  return scheduleFixture({
    recurrenceType: "once",
    title: "테스트 항목",
    ...overrides,
  });
}
