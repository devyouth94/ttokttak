import { queryClient } from "~/query-client";

import {
  activeScheduleDataKey,
  invalidateScheduleCache,
  scheduleDetailKey,
  scheduleItemKey,
} from "./cache";

afterEach(() => queryClient.clear());

it("변경한 사용자의 목록·단건·상세만 무효화하고 다른 사용자의 캐시는 유지한다", async () => {
  const keys = [
    activeScheduleDataKey,
    (userId: string) => scheduleItemKey(userId, "same-item"),
    (userId: string) => scheduleDetailKey(userId, "same-item"),
  ];
  for (const key of keys) {
    queryClient.setQueryData(key("user-a"), "A의 데이터");
    queryClient.setQueryData(key("user-b"), "B의 데이터");
  }

  await invalidateScheduleCache("user-a");

  for (const key of keys) {
    expect(queryClient.getQueryState(key("user-a"))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(key("user-b"))?.isInvalidated).toBe(false);
    expect(queryClient.getQueryData(key("user-a"))).toBe("A의 데이터");
    expect(queryClient.getQueryData(key("user-b"))).toBe("B의 데이터");
  }
});
