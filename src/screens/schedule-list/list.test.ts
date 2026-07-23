import { useTranslation } from "react-i18next";

import { scheduleFixture, type ScheduleOverrides } from "~/schedule/fixtures";
import { useNow } from "~/schedule/now";
import { useScheduleRange } from "~/schedule/query";
import type { Schedule } from "~/schedule/schedule";
import { useSession } from "~/session/provider";

import { type Sort, useItems } from "./list";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: <T>(factory: () => T): T => factory(),
}));
jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));
jest.mock("~/schedule/now", () => ({ useNow: jest.fn() }));
jest.mock("~/schedule/query", () => ({ useScheduleRange: jest.fn() }));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));

const now = new Date("2026-04-20T03:00:00.000Z");
const timezone = "Asia/Seoul";
const refetch = jest.fn();

describe("일정 목록", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("English 문구와 조회 상태를 제공한다", () => {
    const result = useList({
      items: [
        item({
          id: "weekly",
          recurrenceType: "weekly",
          title: "한국어 제목",
          weekdayMask: [1, 3],
        }),
        item({
          id: "past-once",
          recurrenceType: "once",
          startDateLocal: "2026-04-19",
          title: "지난 한 번",
        }),
      ],
      language: "en",
    });

    expect(result.rows.find((row) => row.id === "weekly")).toMatchObject({
      nextOccurrenceTimeLabel: "9:00 AM",
      recurrenceLabel: "Weekly Mon·Wed",
      title: "한국어 제목",
    });
    expect(
      result.rows.find((row) => row.id === "past-once")?.nextOccurrenceTimeLabel
    ).toBe("No upcoming time");
    expect(result).toMatchObject({
      refetch,
      status: "ready",
    });
    expect(useScheduleRange).toHaveBeenCalledWith({
      endLocalDate: "2026-04-20",
      startLocalDate: "2024-04-20",
    });
  });

  it("한국어 문구와 일정 색상을 제공한다", () => {
    const result = useList({
      items: [
        item({
          colorKey: "purple",
          id: "vitamin",
          recurrenceType: "once",
          startDateLocal: "2026-04-19",
          title: "영양제",
        }),
      ],
    });

    expect(result.rows[0]).toMatchObject({
      colorKey: "purple",
      nextOccurrenceTimeLabel: "예정 없음",
      nextScheduledAtUtc: null,
      title: "영양제",
    });
  });

  it("기본 제목순과 선택한 생성순을 적용한다", () => {
    const items = [
      item({
        createdAt: "2026-04-20T00:00:00.000Z",
        id: "alpha",
        title: "가장 앞 제목",
      }),
      item({
        createdAt: "2026-04-21T00:00:00.000Z",
        id: "beta",
        title: "나중 제목",
      }),
    ];

    expect(useList({ items }).rows.map((row) => row.id)).toEqual([
      "alpha",
      "beta",
    ]);
    expect(
      useList({ items, sort: "createdDesc" }).rows.map((row) => row.id)
    ).toEqual(["beta", "alpha"]);
  });

  it.each([
    { error: new Error("조회 실패"), isLoading: true, status: "loading" },
    { error: new Error("조회 실패"), isLoading: false, status: "error" },
    { error: null, isLoading: false, status: "ready" },
  ] as const)(
    "조회 상태를 $status 상태로 합친다",
    ({ error, isLoading, status }) => {
      expect(useList({ error, isLoading, items: [] }).status).toBe(status);
    }
  );
});

function useList({
  error = null,
  isLoading = false,
  items,
  language = "ko",
  sort = "titleAsc",
}: {
  error?: Error | null;
  isLoading?: boolean;
  items: Schedule[];
  language?: "en" | "ko";
  sort?: Sort;
}) {
  jest.mocked(useTranslation).mockReturnValue({
    i18n: { language, resolvedLanguage: language },
  } as never);
  jest.mocked(useSession).mockReturnValue({
    profile: { timezone },
  } as never);
  jest.mocked(useNow).mockReturnValue(now);
  jest.mocked(useScheduleRange).mockReturnValue({
    error,
    isLoading,
    items,
    logs: [],
    refetch,
    timezone,
  } as never);

  return useItems(sort);
}

function item(
  overrides: ScheduleOverrides & Pick<Schedule, "id" | "title">
): Schedule {
  return scheduleFixture({
    createdAt: "2026-04-20T00:00:00.000Z",
    startDateLocal: "2026-04-22",
    ...overrides,
  });
}
