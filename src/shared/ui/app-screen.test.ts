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

describe("AppScreen theme background", () => {
  it("safe-area와 기본 content 배경은 resolved theme 색상을 따른다", () => {
    const appScreen = readWorkspaceFile("src/shared/ui/app-screen.tsx");

    expect(appScreen).toContain("useAppThemeColors()");
    expect(appScreen).toContain("themeColors.background");
    expect(appScreen).not.toContain("colors.background");
  });
});
