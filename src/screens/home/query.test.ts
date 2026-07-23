import { useScheduleRange } from "~/schedule/query";
import { useSession } from "~/session/provider";

import { useHomeQuery } from "./query";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: <T>(factory: () => T): T => factory(),
}));
jest.mock("~/schedule/query", () => ({ useScheduleRange: jest.fn() }));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));

describe("홈 일정 조회 범위", () => {
  beforeEach(() => {
    jest.mocked(useSession).mockReturnValue({
      profile: { timezone: "Asia/Seoul" },
    } as never);
    jest.mocked(useScheduleRange).mockReturnValue({
      items: [],
      logs: [],
      timezone: "Asia/Seoul",
    } as never);
  });

  it("오늘은 지난 730일부터 다가오는 14일까지 조회한다", () => {
    useHomeQuery({
      now: new Date("2026-04-10T03:00:00.000Z"),
      selectedDateId: "2026-04-10",
    });

    expect(useScheduleRange).toHaveBeenCalledWith({
      endLocalDate: "2026-04-24",
      startLocalDate: "2024-04-10",
    });
  });

  it("다른 날짜는 선택한 하루만 조회한다", () => {
    useHomeQuery({
      now: new Date("2026-04-10T03:00:00.000Z"),
      selectedDateId: "2026-04-13",
    });

    expect(useScheduleRange).toHaveBeenLastCalledWith({
      endLocalDate: "2026-04-13",
      startLocalDate: "2026-04-13",
    });
  });
});
