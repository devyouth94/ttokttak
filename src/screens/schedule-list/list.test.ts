import { useTranslation } from "react-i18next";

import { useScheduleReadContext } from "~/application/schedule-read";
import type { RecurringItem } from "~/entities/schedule";
import {
  createRecurringItemFixture,
  type RecurringItemFixtureOverrides,
} from "~/entities/schedule/testing";
import { useOccurrenceProjectionNow } from "~/features/read-schedule/model/use-occurrence-projection-now";
import { useOccurrenceProjectionQuery } from "~/features/read-schedule/model/use-occurrence-projection-query";

import { type Sort, useItems } from "./list";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: <T>(factory: () => T): T => factory(),
}));
jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));
jest.mock("~/application/schedule-read", () => ({
  useScheduleReadContext: jest.fn(),
}));
jest.mock(
  "~/features/read-schedule/model/use-occurrence-projection-now",
  () => ({ useOccurrenceProjectionNow: jest.fn() })
);
jest.mock(
  "~/features/read-schedule/model/use-occurrence-projection-query",
  () => ({ useOccurrenceProjectionQuery: jest.fn() })
);

const now = new Date("2026-04-20T03:00:00.000Z");
const context = {
  isReady: true,
  timezone: "Asia/Seoul",
  userId: "user-1",
};
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
    expect(useOccurrenceProjectionQuery).toHaveBeenCalledWith({
      context,
      purpose: { now, type: "scheduleList" },
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
  items: RecurringItem[];
  language?: "en" | "ko";
  sort?: Sort;
}) {
  jest.mocked(useTranslation).mockReturnValue({
    i18n: { language, resolvedLanguage: language },
  } as never);
  jest.mocked(useScheduleReadContext).mockReturnValue(context);
  jest.mocked(useOccurrenceProjectionNow).mockReturnValue(now);
  jest.mocked(useOccurrenceProjectionQuery).mockReturnValue({
    completionLogs: [],
    error,
    isLoading,
    isRefreshing: false,
    items,
    refetch,
    timezone: context.timezone,
  } as never);

  return useItems(sort);
}

function item(
  overrides: RecurringItemFixtureOverrides & Pick<RecurringItem, "id" | "title">
): RecurringItem {
  return createRecurringItemFixture({
    createdAt: "2026-04-20T00:00:00.000Z",
    startDateLocal: "2026-04-22",
    updatedAt: "2026-04-20T00:00:00.000Z",
    ...overrides,
  });
}
