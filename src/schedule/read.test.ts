import { listItems } from "./db/items";
import { listLogs } from "./db/logs";
import { logFixture, scheduleFixture } from "./fixtures";
import { readActiveScheduleData } from "./read";

jest.mock("./db/items", () => ({ listItems: jest.fn() }));
jest.mock("./db/logs", () => ({ listLogs: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
});

it("활성 일정 응답의 ID 전체에 해당하는 기록을 함께 읽는다", async () => {
  const schedules = [
    scheduleFixture({ id: "A1" }),
    scheduleFixture({ id: "A2" }),
  ];
  const logs = [logFixture({ itemId: "A1" })];
  jest.mocked(listItems).mockResolvedValue(schedules);
  jest.mocked(listLogs).mockResolvedValue(logs);

  await expect(readActiveScheduleData({ userId: "user-a" })).resolves.toEqual({
    logs,
    schedules,
  });
  expect(listLogs).toHaveBeenCalledWith({
    itemIds: ["A1", "A2"],
    userId: "user-a",
  });
});

it("기록 조회 실패를 일정만 있는 정상 결과로 바꾸지 않는다", async () => {
  const error = new Error("기록 조회 실패");
  jest.mocked(listItems).mockResolvedValue([scheduleFixture()]);
  jest.mocked(listLogs).mockRejectedValue(error);

  await expect(readActiveScheduleData({ userId: "user-a" })).rejects.toBe(
    error
  );
});

it("활성 일정이 없으면 기록을 요청하지 않는다", async () => {
  jest.mocked(listItems).mockResolvedValue([]);

  await expect(readActiveScheduleData({ userId: "user-a" })).resolves.toEqual({
    logs: [],
    schedules: [],
  });
  expect(listLogs).not.toHaveBeenCalled();
});
