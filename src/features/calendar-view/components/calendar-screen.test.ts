declare const process: {
  cwd: () => string;
};
declare const require: (moduleName: string) => unknown;

const { readFileSync } = require("fs") as {
  readFileSync: (path: string, encoding: "utf8") => string;
};

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(`${process.cwd()}/${relativePath}`, "utf8");
}

describe("CalendarScreen", () => {
  it("월 이동은 스와이프가 아니라 상단 화살표로만 제공한다", () => {
    const calendarScreen = readWorkspaceFile(
      "src/features/calendar-view/components/calendar-screen.tsx"
    );

    expect(calendarScreen).toContain("<MonthArrowButton");
    expect(calendarScreen).not.toContain("enableSwipeMonths");
    expect(calendarScreen).not.toContain("onMonthChange=");
  });

  it("캘린더의 현재 시각 기준은 mount 시점에 고정하지 않는다", () => {
    const calendarScreen = readWorkspaceFile(
      "src/features/calendar-view/components/calendar-screen.tsx"
    );

    expect(calendarScreen).toContain("useOccurrenceProjectionNow");
    expect(calendarScreen).not.toContain("useMemo(() => new Date(), [])");
  });
});
