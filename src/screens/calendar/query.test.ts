import { scheduleFixture } from "~/schedule/fixtures";
import { useScheduleRange } from "~/schedule/query";

import { useCalendarQuery } from "./query";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: <T>(factory: () => T): T => factory(),
}));
jest.mock("~/schedule/query", () => ({ useScheduleRange: jest.fn() }));

it("캘린더는 보이는 월만 조회한다", () => {
  jest.mocked(useScheduleRange).mockReturnValue({
    items: [],
    logs: [],
    timezone: "Asia/Seoul",
  } as never);

  useCalendarQuery({
    now: new Date("2026-04-10T03:00:00.000Z"),
    selectedDate: "2026-04-10",
    visibleMonth: "2026-04",
  });

  expect(useScheduleRange).toHaveBeenCalledWith({
    endLocalDate: "2026-04-30",
    startLocalDate: "2026-04-01",
  });
});

it("완료 기록 로딩 중에는 임시 occurrence를 노출하지 않는다", () => {
  jest.mocked(useScheduleRange).mockReturnValue({
    error: null,
    isLoading: true,
    items: [
      scheduleFixture({
        anchorType: "completion_based",
        recurrenceType: "monthly",
        startDateLocal: "2026-07-03",
      }),
    ],
    logs: [],
    timezone: "Asia/Seoul",
  } as never);

  const result = useCalendarQuery({
    now: new Date("2026-08-03T00:00:00.000Z"),
    selectedDate: "2026-08-03",
    visibleMonth: "2026-08",
  });

  expect(result.selectedDateEntries).toEqual([]);
  expect(result.visibleMonthEntries).toEqual([]);
});
