import { getScheduleReturnPath } from "./route-param";

it("일정 화면의 허용된 복귀 경로만 사용한다", () => {
  expect(getScheduleReturnPath("/schedule")).toBe("/schedule");
  expect(getScheduleReturnPath("/items/item-1")).toBe("/");
  expect(getScheduleReturnPath()).toBe("/");
});
