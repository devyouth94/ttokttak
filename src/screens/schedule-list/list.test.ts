import { createElement, type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { scheduleFixture, type ScheduleOverrides } from "~/schedule/fixtures";
import { useNow } from "~/schedule/now";
import { useSchedules } from "~/schedule/query";
import type { Schedule } from "~/schedule/schedule";

import { useScheduleList } from "./list";

jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));
jest.mock("~/schedule/now", () => ({ useNow: jest.fn() }));
jest.mock("~/schedule/query", () => ({ useSchedules: jest.fn() }));

declare const require: (moduleName: string) => unknown;

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => void;
};

const now = new Date("2026-04-20T03:00:00.000Z");
const timezone = "Asia/Seoul";
const refetch = jest.fn();

describe("일정 목록", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refetch.mockResolvedValue(undefined);
  });

  it("English 문구와 조회 상태를 제공한다", async () => {
    const list = await renderList({
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

    expect(list.current.rows.find((row) => row.id === "weekly")).toMatchObject({
      nextOccurrenceTimeLabel: "9:00 AM",
      recurrenceLabel: "Weekly Mon·Wed",
      title: "한국어 제목",
    });
    expect(
      list.current.rows.find((row) => row.id === "past-once")
        ?.nextOccurrenceTimeLabel
    ).toBe("No upcoming time");
    expect(list.current).toMatchObject({
      refreshing: false,
      retry: refetch,
      status: "ready",
    });
  });

  it("한국어 문구와 일정 색상을 제공한다", async () => {
    const list = await renderList({
      items: [
        item({
          colorHex: "#D4A8EA",
          id: "vitamin",
          recurrenceType: "once",
          startDateLocal: "2026-04-19",
          title: "영양제",
        }),
      ],
    });

    expect(list.current.rows[0]).toMatchObject({
      colorHex: "#D4A8EA",
      nextOccurrenceTimeLabel: "예정 없음",
      nextScheduledAtUtc: null,
      title: "영양제",
    });
  });

  it("기본 제목순과 선택한 생성순을 적용한다", async () => {
    const list = await renderList({
      items: [
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
      ],
    });

    expect(list.current.rows.map((row) => row.id)).toEqual(["alpha", "beta"]);

    await TestRenderer.act(() => {
      list.current.setSort("createdDesc");
    });

    expect(list.current.rows.map((row) => row.id)).toEqual(["beta", "alpha"]);
  });

  it("당겨 새로고침 상태를 일반 조회 상태와 별도로 관리한다", async () => {
    let finishRefetch!: () => void;
    refetch.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishRefetch = resolve;
        })
    );
    const list = await renderList({ items: [] });
    let refreshPromise!: Promise<void>;

    await TestRenderer.act(() => {
      refreshPromise = list.current.refresh();
    });

    expect(list.current.refreshing).toBe(true);

    finishRefetch();
    await TestRenderer.act(() => refreshPromise);

    expect(list.current.refreshing).toBe(false);
  });

  it.each([
    { error: new Error("조회 실패"), isLoading: true, status: "loading" },
    { error: new Error("조회 실패"), isLoading: false, status: "error" },
    { error: null, isLoading: false, status: "ready" },
  ] as const)(
    "조회 상태를 $status 상태로 합친다",
    async ({ error, isLoading, status }) => {
      const list = await renderList({ error, isLoading, items: [] });

      expect(list.current.status).toBe(status);
    }
  );
});

async function renderList({
  error = null,
  isLoading = false,
  items,
  language = "ko",
}: {
  error?: Error | null;
  isLoading?: boolean;
  items: Schedule[];
  language?: "en" | "ko";
}) {
  jest.mocked(useTranslation).mockReturnValue({
    i18n: { language, resolvedLanguage: language },
  } as never);
  jest.mocked(useNow).mockReturnValue(now);
  jest.mocked(useSchedules).mockReturnValue({
    error,
    isLoading,
    items,
    logs: [],
    refetch,
    timezone,
  } as never);

  let current!: ReturnType<typeof useScheduleList>;

  function Probe(): null {
    current = useScheduleList();
    return null;
  }

  await TestRenderer.act(() => {
    TestRenderer.create(createElement(Probe));
  });

  return {
    get current() {
      return current;
    },
  };
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
