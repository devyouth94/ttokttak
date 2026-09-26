import { queryClient } from "~/query-client";

import {
  activeScheduleDataKey,
  invalidateScheduleCache,
  scheduleDetailKey,
  scheduleItemKey,
} from "./cache";

jest.mock("~/query-client", () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

it("일정 key와 무효화 범위를 사용자별로 분리한다", async () => {
  expect(activeScheduleDataKey("user-1")).toEqual([
    "schedule",
    "user-1",
    "active-data",
  ]);
  expect(scheduleItemKey("user-1", "item-1")).toEqual([
    "schedule",
    "user-1",
    "item",
    "item-1",
  ]);
  expect(scheduleDetailKey("user-1", "item-1")).toEqual([
    "schedule",
    "user-1",
    "detail",
    "item-1",
  ]);

  await invalidateScheduleCache("user-1");

  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: ["schedule", "user-1"],
  });
});
