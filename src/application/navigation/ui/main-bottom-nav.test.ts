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

describe("MainBottomNav i18n", () => {
  it("중앙 일정 추가 버튼 접근성 문구를 표시 언어에서 읽는다", () => {
    const mainBottomNav = readWorkspaceFile(
      "src/application/navigation/ui/main-bottom-nav.tsx"
    );

    expect(mainBottomNav).toContain("useTranslation()");
    expect(mainBottomNav).toContain('t("navigation.createItemHint")');
    expect(mainBottomNav).toContain('t("navigation.createItemLabel")');
  });

  it("하단 탭 바는 현재 테마 색 토큰으로 배경과 아이콘 색을 만든다", () => {
    const mainBottomNav = readWorkspaceFile(
      "src/application/navigation/ui/main-bottom-nav.tsx"
    );

    expect(mainBottomNav).toContain("useAppThemeColors()");
    expect(mainBottomNav).toContain("createMainBottomNavStyles(themeColors)");
    expect(mainBottomNav).toContain("themeColors.primary");
    expect(mainBottomNav).toContain("themeColors.primaryForeground");
    expect(mainBottomNav).not.toContain("colors.");
  });
});
