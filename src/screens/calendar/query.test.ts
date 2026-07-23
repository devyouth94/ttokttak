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
