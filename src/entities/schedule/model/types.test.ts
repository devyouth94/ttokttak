import {
  createRecurringItemFixture,
  createScheduleVersionFixture,
} from "./test-fixtures";
import { getCurrentScheduleVersion } from "./types";

describe("getCurrentScheduleVersion", () => {
  it("적용 시각이 같으면 목록의 마지막 version을 현재 규칙으로 사용한다", () => {
    const item = createRecurringItemFixture({
      scheduleVersions: [
        createScheduleVersionFixture({ id: "version-1" }),
        createScheduleVersionFixture({ id: "version-2" }),
      ],
    });

    expect(getCurrentScheduleVersion(item).id).toBe("version-2");
  });
});
