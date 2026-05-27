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

describe("schedule screen theme", () => {
  it("홈 화면 UI는 현재 테마 색 토큰을 사용하고 일정 색상 팔레트를 배경 텍스트로 쓰지 않는다", () => {
    const homeFiles = [
      "src/screens/home/ui/home-date-carousel.tsx",
      "src/screens/home/ui/home-feed-error-card.tsx",
      "src/screens/home/ui/home-feed-item-row.tsx",
      "src/screens/home/ui/home-feed-section-block.tsx",
      "src/screens/home/ui/home-loading-placeholder.tsx",
      "src/screens/home/ui/home-screen.tsx",
      "src/screens/home/ui/home-top-panel.tsx",
    ].map(readWorkspaceFile);

    expect(homeFiles.join("\n")).toContain("useAppThemeColors()");
    expect(homeFiles.join("\n")).toContain("themeColors.surface");
    expect(homeFiles.join("\n")).toContain("themeColors.text");
    expect(homeFiles.join("\n")).not.toContain("colors.");
  });

  it("목록 화면 row, placeholder, 상태 화면은 현재 테마 색 토큰을 사용한다", () => {
    const listFiles = [
      "src/entities/schedule/ui/recurring-item-summary-row.tsx",
      "src/screens/schedule-list/ui/schedule-list-loading-placeholder.tsx",
      "src/screens/schedule-list/ui/schedule-list-screen.tsx",
      "src/screens/schedule-list/ui/schedule-list-state-views.tsx",
    ].map(readWorkspaceFile);
    const source = listFiles.join("\n");

    expect(source).toContain("useAppThemeColors()");
    expect(source).toContain("themeColors.dividerOnPrimary");
    expect(source).toContain("themeColors.primary");
    expect(source).not.toContain("colors.");
  });

  it("캘린더 화면과 날짜 셀은 캘린더 theme와 셀 표면을 현재 테마에서 만든다", () => {
    const calendarScreen = readWorkspaceFile(
      "src/screens/calendar/ui/calendar-screen.tsx"
    );
    const dayCell = readWorkspaceFile(
      "src/screens/calendar/ui/calendar-day-cell.tsx"
    );

    expect(calendarScreen).toContain("createCalendarTheme(themeColors)");
    expect(calendarScreen).toContain("createCalendarScreenStyles(themeColors)");
    expect(dayCell).toContain("useAppThemeColors()");
    expect(dayCell).toContain("themeColors.primaryForeground");
    expect(`${calendarScreen}\n${dayCell}`).not.toContain("colors.");
  });

  it("상세 화면 summary, history, action 영역은 현재 테마 스타일 훅을 사용한다", () => {
    const detailScreen = readWorkspaceFile(
      "src/screens/schedule-detail/ui/schedule-detail-screen.tsx"
    );
    const detailStyles = readWorkspaceFile(
      "src/screens/schedule-detail/ui/schedule-detail-screen.styles.ts"
    );

    expect(detailScreen).toContain("useScheduleDetailScreenStyles()");
    expect(detailStyles).toContain("createScheduleDetailScreenStyles");
    expect(detailStyles).toContain("themeColors.surface");
    expect(detailStyles).toContain("themeColors.primaryForeground");
    expect(`${detailScreen}\n${detailStyles}`).not.toContain("colors.");
  });

  it("일정 색상 marker는 고정 팔레트 swatch 값만 사용한다", () => {
    const colorPalette = readWorkspaceFile(
      "src/entities/schedule/ui/color-palette.ts"
    );
    const summaryRow = readWorkspaceFile(
      "src/entities/schedule/ui/recurring-item-summary-row.tsx"
    );
    const calendarDayCell = readWorkspaceFile(
      "src/screens/calendar/ui/calendar-day-cell.tsx"
    );
    const detailScreen = readWorkspaceFile(
      "src/screens/schedule-detail/ui/schedule-detail-screen.tsx"
    );

    expect(colorPalette).toContain('swatchColor: "#F5A3A3"');
    expect(summaryRow).toContain(
      "recurringItemColorOptionByKey[colorKey].swatchColor"
    );
    expect(calendarDayCell).toContain(
      "recurringItemColorOptionByKey[colorKey].swatchColor"
    );
    expect(detailScreen).toContain(
      "style={[styles.summaryColorMarker, { backgroundColor: swatchColor }]}"
    );
  });
});
