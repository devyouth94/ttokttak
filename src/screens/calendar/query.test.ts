import { createElement, type ReactElement } from "react";

import { scheduleFixture } from "~/schedule/fixtures";
import { useNow } from "~/schedule/now";
import { useSchedules } from "~/schedule/query";

import { useCalendarScreen } from "./query";

jest.mock("~/schedule/now", () => ({ useNow: jest.fn() }));
jest.mock("~/schedule/query", () => ({ useSchedules: jest.fn() }));

declare const require: (moduleName: string) => unknown;

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => {
    update: (element: ReactElement) => void;
  };
};

const now = new Date("2026-04-10T03:00:00.000Z");
const refetch = jest.fn();
let queryResult: ReturnType<typeof useSchedules>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useNow).mockReturnValue(now);
  queryResult = {
    error: null,
    isLoading: false,
    items: [scheduleFixture({ startDateLocal: "2026-03-01" })],
    logs: [],
    refetch,
    timezone: "Asia/Seoul",
  } as never;
  jest.mocked(useSchedules).mockImplementation(() => queryResult);
});

it("선택 날짜가 속한 월의 occurrence와 명시적인 화면 계약을 제공한다", async () => {
  const calendar = await renderCalendar();

  expect(calendar.current.occurrenceEntries).toHaveLength(30);
  expect(calendar.current.occurrenceEntries[0]?.occurrence.localDate).toBe(
    "2026-04-01"
  );
  expect(calendar.current.occurrenceEntries.at(-1)?.occurrence.localDate).toBe(
    "2026-04-30"
  );
  expect(calendar.current).toMatchObject({
    errorMessage: null,
    isLoading: false,
    selectedDate: "2026-04-10",
    timezone: "Asia/Seoul",
    today: "2026-04-10",
  });
});

it("완료 기록 로딩 중에는 임시 occurrence를 노출하지 않는다", async () => {
  queryResult = {
    ...queryResult,
    isLoading: true,
    items: [
      scheduleFixture({
        anchorType: "completion_based",
        recurrenceType: "monthly",
        startDateLocal: "2026-07-03",
      }),
    ],
  };

  const calendar = await renderCalendar();

  expect(calendar.current.occurrenceEntries).toEqual([]);
});

it("시간대가 바뀌면 오늘을 보고 있을 때 선택 날짜도 맞춘다", async () => {
  jest.mocked(useNow).mockReturnValue(new Date("2026-05-01T06:30:00.000Z"));
  const calendar = await renderCalendar();

  expect(calendar.current.selectedDate).toBe("2026-05-01");

  queryResult = {
    ...queryResult,
    timezone: "America/Los_Angeles",
  };

  await TestRenderer.act(() => {
    calendar.update();
  });

  expect(calendar.current.selectedDate).toBe("2026-04-30");
  expect(calendar.current.today).toBe("2026-04-30");
});

async function renderCalendar() {
  let current!: ReturnType<typeof useCalendarScreen>;
  let renderer!: ReturnType<typeof TestRenderer.create>;

  function Probe(): null {
    current = useCalendarScreen();
    return null;
  }

  function element(): ReactElement {
    return createElement(Probe);
  }

  await TestRenderer.act(() => {
    renderer = TestRenderer.create(element());
  });

  return {
    get current() {
      return current;
    },
    update: () => renderer.update(element()),
  };
}
