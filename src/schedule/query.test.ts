import { useQuery } from "@tanstack/react-query";

import { useSession } from "~/session/provider";

import { scheduleFixture, testTimezone } from "./fixtures";
import { useScheduleById, useScheduleRange } from "./query";

const refetch = jest.fn(async () => undefined);
const queryResult = {
  data: undefined,
  error: null,
  isPending: false,
  refetch,
};

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useCallback: <T>(callback: T): T => callback,
  useMemo: <T>(factory: () => T): T => factory(),
}));
jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn() }));
jest.mock("./db/items", () => ({
  getItem: jest.fn(),
  listItems: jest.fn(),
}));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));
jest.mock("~/query-client", () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSession).mockReturnValue({
    profile: { timezone: testTimezone },
    status: "ready",
    user: { id: "user-1" },
  } as never);
});

it("조회 범위와 완료일 기준 일정의 anchor 대상을 query key에 반영한다", () => {
  const items = [
    scheduleFixture({ id: "fixed" }),
    scheduleFixture({
      anchorType: "completion_based",
      id: "completion-based",
      recurrenceType: "interval_days",
    }),
  ];
  jest
    .mocked(useQuery)
    .mockReturnValueOnce({ ...queryResult, data: items } as never)
    .mockReturnValueOnce(queryResult as never);
  useScheduleRange({
    endLocalDate: "2026-04-12",
    startLocalDate: "2026-04-10",
  });

  expect(jest.mocked(useQuery).mock.calls[1]?.[0].queryKey).toEqual([
    "schedule",
    "user-1",
    "logs",
    ["completion-based", "fixed"],
    ["completion-based"],
    "2026-04-09T15:00:00.000Z",
    "2026-04-12T14:59:59.999Z",
  ]);
});

it("일정 하나만 필요한 화면은 기록 없이 해당 일정만 조회한다", () => {
  const item = scheduleFixture({ id: "item-1" });
  const response = { ...queryResult, data: item };

  jest.mocked(useQuery).mockReturnValue(response as never);

  expect(useScheduleById("item-1")).toBe(response);
  const options = jest.mocked(useQuery).mock.calls[0]![0];

  expect(options.queryKey).toEqual(["schedule", "user-1", "item", "item-1"]);
  expect(useQuery).toHaveBeenCalledTimes(1);
});

it.each([
  ["ready", "user-1", "item-1", true],
  ["ready", "user-2", "item-1", true],
  ["loading", "user-1", "item-1", false],
  ["error", "user-1", "item-1", false],
  ["signedOut", null, "item-1", false],
  ["ready", "user-1", null, false],
] as const)(
  "세션 %s, 사용자 %s, 일정 %s로 조회 실행 조건과 key를 구성한다",
  (status, userId, itemId, enabled) => {
    jest.mocked(useSession).mockReturnValue({
      status,
      user: userId ? { id: userId } : null,
    } as never);
    jest.mocked(useQuery).mockReturnValue(queryResult as never);
    useScheduleById(itemId);
    expect(jest.mocked(useQuery).mock.calls[0]?.[0]).toMatchObject({
      enabled,
      queryKey: ["schedule", userId ?? "signed-out", "item", itemId],
    });
  }
);

it("세션 오류를 일정 로딩으로 취급하지 않는다", () => {
  jest.mocked(useSession).mockReturnValue({
    profile: null,
    status: "error",
    user: { id: "user-1" },
  } as never);
  jest
    .mocked(useQuery)
    .mockReturnValue({ ...queryResult, isPending: true } as never);

  const result = useScheduleRange({
    endLocalDate: "2026-04-10",
    startLocalDate: "2026-04-10",
  });

  expect(result.isLoading).toBe(false);
});
