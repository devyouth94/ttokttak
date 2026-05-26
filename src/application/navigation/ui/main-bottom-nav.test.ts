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
  it("중앙 일정 추가 버튼 접근성 문구를 앱 표시 언어에서 읽는다", () => {
    const mainBottomNav = readWorkspaceFile(
      "src/application/navigation/ui/main-bottom-nav.tsx"
    );

    expect(mainBottomNav).toContain("useTranslation()");
    expect(mainBottomNav).toContain('t("navigation.createItemHint")');
    expect(mainBottomNav).toContain('t("navigation.createItemLabel")');
  });
});
