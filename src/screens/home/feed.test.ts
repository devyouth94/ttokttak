import { useTranslation } from "react-i18next";
import { useIsFocused } from "@react-navigation/native";

import { useAppLanguage } from "~/i18n/provider";
import { useNotifications } from "~/notifications/provider";
import {
  logFixture,
  ruleFixture,
  scheduleFixture,
  type ScheduleOverrides,
  testTimezone as timezone,
} from "~/schedule/fixtures";
import { useNow } from "~/schedule/now";
import { useScheduleRange } from "~/schedule/query";
import type { OccurrenceLog } from "~/schedule/rules/occurrence";
import type { RuleVersion } from "~/schedule/rules/recurrence";
import type { Schedule } from "~/schedule/schedule";
import { useSession } from "~/session/provider";

import { useHomeActions } from "./action";
import { useHomeFeed } from "./feed";
import { createHomeDateOptions } from "./ui/home-date-carousel";

let mockSelectedDateId: string | undefined;

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useCallback: <T>(callback: T): T => callback,
  useEffect: jest.fn(),
  useMemo: <T>(factory: () => T): T => factory(),
  useRef: <T>(value: T) => ({ current: value }),
  useState: <T>(initial: T | (() => T)): [T, jest.Mock] => {
    const initialValue =
      typeof initial === "function" ? (initial as () => T)() : initial;

    return [(mockSelectedDateId ?? initialValue) as T, jest.fn()];
  },
}));
jest.mock("react-i18next", () => ({ useTranslation: jest.fn() }));
jest.mock("@react-navigation/native", () => ({ useIsFocused: jest.fn() }));
jest.mock("~/i18n/provider", () => ({ useAppLanguage: jest.fn() }));
jest.mock("~/notifications/provider", () => ({
  useNotifications: jest.fn(),
}));
jest.mock("~/schedule/now", () => ({ useNow: jest.fn() }));
jest.mock("~/schedule/query", () => ({ useScheduleRange: jest.fn() }));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));
jest.mock("./action", () => ({ useHomeActions: jest.fn() }));

const now = new Date("2026-04-10T03:00:00.000Z");
const refetch = jest.fn();

describe("홈 피드", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedDateId = undefined;
  });

  it("오늘은 지난 730일부터 다가오는 14일까지 세 섹션을 만든다", () => {
    const home = useFeed({
      items: [
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

    expect(useScheduleRange).toHaveBeenCalledWith({
      endLocalDate: "2026-04-24",
      startLocalDate: "2024-04-10",
    });
    expect(home.sections.map((section) => section.title)).toEqual([
      "home.feed.sectionOverdue",
      "home.feed.sectionToday",
      "home.feed.sectionUpcoming",
    ]);
    expect(home.sections[0]?.items[0]).toMatchObject({
      dateSeparatorLabel: null,
      metaLine: "home.feed.overdueDays · 오전 9:00 · 한 번",
    });
    expect(home.sections[1]?.items[0]?.metaLine).toBe("오후 6:00 · 한 번");
    expect(home.sections[2]?.items[0]).toMatchObject({
      dateSeparatorLabel: "4월 13일",
      metaLine: "오전 9:00 · 한 번",
    });
  });

  it("다른 날짜는 선택한 하루와 해당 섹션만 만든다", () => {
    const home = useFeed({
      items: [
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

    expect(useScheduleRange).toHaveBeenCalledWith({
      endLocalDate: "2026-04-13",
      startLocalDate: "2026-04-13",
    });
    expect(home.sections).toHaveLength(1);
    expect(home.sections[0]).toMatchObject({
      title: "4월 13일",
      items: [{ item: { title: "복용 체크" } }],
    });
  });

  it("English 날짜·시간을 만든다", () => {
    const home = useFeed({
      items: [
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

    expect(home.sections.map((section) => section.title)).toEqual([
      "home.feed.sectionOverdue",
      "home.feed.sectionToday",
      "home.feed.sectionUpcoming",
    ]);
    expect(home.sections[0]?.items[0]?.metaLine).toBe(
      "home.feed.overdueDays · 9:00 AM · Once"
    );
    expect(home.sections[1]?.items[0]?.metaLine).toBe("6:00 PM · Once");
    expect(home.sections[2]).toMatchObject({
      caption: "home.feed.upcomingCaption",
      emptyMessage: "home.feed.emptyUpcoming",
    });
  });

  it("지난 일정은 일정별 최신 occurrence 하나만 노출한다", () => {
    const home = useFeed({
      items: [
        item({
          id: "interval-overdue-item",
          intervalValue: 3,
          recurrenceType: "interval_days",
          startDateLocal: "2026-04-04",
          title: "치약 교체",
        }),
      ],
    });

    expect(home.sections[0]?.items).toHaveLength(1);
    expect(home.sections[0]?.items[0]).toMatchObject({
      item: { title: "치약 교체" },
      metaLine: "home.feed.overdueDays · 오전 9:00 · 3일마다",
    });
  });

  it("다가오는 일정은 14일 범위 안에서 개수 제한 없이 노출한다", () => {
    const home = useFeed({
      items: Array.from({ length: 15 }, (_, index) =>
        item({
          id: `upcoming-item-${index + 1}`,
          startDateLocal: `2026-04-${String(index + 11).padStart(2, "0")}`,
          title: `다가오는 일정 ${index + 1}`,
        })
      ),
    });
    const upcoming = home.sections[2];

    expect(upcoming?.items).toHaveLength(14);
    expect(upcoming?.items[0]?.dateSeparatorLabel).toBe("home.feed.tomorrow");
    expect(upcoming?.items[13]?.dateSeparatorLabel).toBe("4월 24일");
  });

  it("수정된 규칙 버전은 미래 occurrence부터 적용한다", () => {
    const home = useFeed({
      items: [
        item({
          id: "edited-item",
          versions: [
            version({
              intervalValue: 3,
              recurrenceType: "interval_days",
              seedStartDateLocal: "2026-04-10",
            }),
            version({
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
    });

    expect(home.sections[2]?.items[0]?.occurrence.localDate).toBe("2026-04-17");
  });

  it("날짜 캐러셀은 오늘부터 15일을 표시 언어에 맞게 만든다", () => {
    const options = createHomeDateOptions(now, "en", "Today");

    expect(options).toHaveLength(15);
    expect(options[0]).toMatchObject({
      dayLabel: "Fri",
      id: "2026-04-10",
      title: "Today",
      value: "10",
    });
    expect(options[14]?.id).toBe("2026-04-24");
  });
});

function useFeed({
  items,
  language = "ko",
  logs = [],
  now: currentNow = now,
  selectedDateId = "2026-04-10",
}: {
  items: Schedule[];
  language?: "en" | "ko";
  logs?: OccurrenceLog[];
  now?: Date;
  selectedDateId?: string;
}) {
  mockSelectedDateId = selectedDateId;
  jest.mocked(useTranslation).mockReturnValue({
    t: (key: string) => key,
  } as never);
  jest.mocked(useAppLanguage).mockReturnValue({ language } as never);
  jest.mocked(useNotifications).mockReturnValue({
    syncNotifications: jest.fn(),
  } as never);
  jest.mocked(useIsFocused).mockReturnValue(true);
  jest.mocked(useNow).mockReturnValue(currentNow);
  jest.mocked(useSession).mockReturnValue({
    profile: { timezone },
  } as never);
  jest.mocked(useScheduleRange).mockReturnValue({
    error: null,
    isLoading: false,
    isReady: true,
    items,
    logs,
    refetch,
    timezone,
    userId: "user-1",
  } as never);
  jest.mocked(useHomeActions).mockReturnValue({
    clearError: jest.fn(),
    errorMessage: null,
    processingIds: [],
    runAction: jest.fn(),
  });

  return useHomeFeed();
}

function item(overrides: ScheduleOverrides = {}): Schedule {
  return scheduleFixture({
    ...(overrides.versions ? {} : { recurrenceType: "once" }),
    title: "테스트 항목",
    ...overrides,
  });
}

function version(overrides: Partial<RuleVersion> = {}): RuleVersion {
  return ruleFixture({
    seedStartDateLocal: "2026-04-10",
    ...overrides,
  });
}
