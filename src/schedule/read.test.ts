import { listItems } from "./db/items";
import { listLogs } from "./db/logs";
import { logFixture, scheduleFixture } from "./fixtures";
import { readActiveScheduleData } from "./read";

jest.mock("./db/items", () => ({ listItems: jest.fn() }));
jest.mock("./db/logs", () => ({ listLogs: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
});

it("이번 일정 응답의 정확한 ID로 전체 처리 기록을 읽는다", async () => {
  const schedules = [
    scheduleFixture({ id: "new-2" }),
    scheduleFixture({ id: "new-1" }),
  ];
  const logs = [logFixture({ itemId: "new-1" })];
  jest.mocked(listItems).mockResolvedValue(schedules);
  jest.mocked(listLogs).mockResolvedValue(logs);

  await expect(readActiveScheduleData({ userId: "user-1" })).resolves.toEqual({
    logs,
    schedules,
  });
  expect(listLogs).toHaveBeenCalledWith({
    itemIds: ["new-2", "new-1"],
    userId: "user-1",
  });
});

it("활성 일정이 없으면 처리 기록 요청 없이 빈 묶음을 반환한다", async () => {
  jest.mocked(listItems).mockResolvedValue([]);

  await expect(readActiveScheduleData({ userId: "user-1" })).resolves.toEqual({
    logs: [],
    schedules: [],
  });
  expect(listLogs).not.toHaveBeenCalled();
});

it("처리 기록 조회 실패를 부분 데이터로 바꾸지 않는다", async () => {
  const error = new Error("후속 페이지 실패");
  jest.mocked(listItems).mockResolvedValue([scheduleFixture()]);
  jest.mocked(listLogs).mockRejectedValue(error);

  await expect(readActiveScheduleData({ userId: "user-1" })).rejects.toBe(
    error
  );
});

it("호출 환경이 일정과 기록 단계를 각각 감쌀 수 있다", async () => {
  jest.mocked(listItems).mockResolvedValue([scheduleFixture()]);
  jest.mocked(listLogs).mockResolvedValue([]);
  const stages: string[] = [];

  await readActiveScheduleData(
    { userId: "user-1" },
    async (stage, operation) => {
      stages.push(stage);
      return operation();
    }
  );

  expect(stages).toEqual(["items", "logs"]);
});
