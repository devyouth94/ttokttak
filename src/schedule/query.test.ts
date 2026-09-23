import { useQuery } from "@tanstack/react-query";

import { useSession } from "~/session/provider";

import { listLogs } from "./db/logs";
import {
  logFixture,
  ruleFixture,
  scheduleFixture,
  testTimezone,
} from "./fixtures";
import { useScheduleById, useSchedules } from "./query";
import { createOccurrences } from "./rules/occurrence";

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
jest.mock("./db/logs", () => ({
  listLogs: jest.fn(),
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

it("활성 일정의 전체 기록을 날짜와 무관한 사용자별 key로 공유한다", () => {
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
  useSchedules();

  expect(jest.mocked(useQuery).mock.calls[1]?.[0].queryKey).toEqual([
    "schedule",
    "user-1",
    "logs",
    ["completion-based", "fixed"],
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

  const result = useSchedules();

  expect(result.isLoading).toBe(false);
});

it.each([false, true])(
  "연속 완료와 건너뛰기 이력을 공급해 과거 월을 정확하게 계산한다: 이후 고정형=%s",
  async (hasNewVersion) => {
    const item = scheduleFixture({
      timezone: "UTC",
      startDateLocal: "2026-03-24",
      anchorType: "completion_based",
      recurrenceType: "interval_days",
      intervalValue: 3,
    });
    if (hasNewVersion) {
      item.versions.push(
        ruleFixture({
          effectiveFromUtc: "2026-05-01T00:00:00.000Z",
          seedStartDateLocal: "2026-05-01",
        })
      );
    }
    const logs = [
      logFixture({
        id: "first",
        scheduledAtUtc: "2026-03-24T09:00:00.000Z",
        actedAtUtc: "2026-03-25T10:00:00.000Z",
      }),
      logFixture({
        id: "second",
        scheduledAtUtc: "2026-03-28T09:00:00.000Z",
        actedAtUtc: "2026-03-29T10:00:00.000Z",
      }),
      logFixture({
        id: "skip",
        action: "skipped",
        scheduledAtUtc: "2026-04-01T09:00:00.000Z",
        actedAtUtc: "2026-04-02T10:00:00.000Z",
      }),
    ];
    jest.mocked(listLogs).mockResolvedValue(logs);
    jest
      .mocked(useQuery)
      .mockReturnValueOnce({ ...queryResult, data: [item] } as never)
      .mockReturnValueOnce(queryResult as never);
    useSchedules();
    const queryFn = jest.mocked(useQuery).mock.calls[1]![0]
      .queryFn as () => Promise<typeof logs>;
    const suppliedLogs = await queryFn();
    const input = {
      now: new Date("2026-04-10T12:00:00.000Z"),
      schedules: [item],
      timezone: "UTC",
    };
    const range = {
      startUtc: "2026-04-01T00:00:00.000Z",
      endUtc: "2026-04-07T23:59:59.999Z",
    };
    const actual = createOccurrences({ ...input, logs: suppliedLogs }).range(
      range
    );
    expect(actual).toEqual(createOccurrences({ ...input, logs }).range(range));
    expect(
      actual.map(({ occurrence }) => [occurrence.localDate, occurrence.status])
    ).toEqual([
      ["2026-04-01", "skipped"],
      ["2026-04-04", "overdue"],
      ["2026-04-07", "overdue"],
    ]);
  }
);
