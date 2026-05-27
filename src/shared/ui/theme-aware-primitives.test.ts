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

describe("theme-aware shared UI", () => {
  it("텍스트와 header는 현재 테마 색 토큰을 사용한다", () => {
    const appText = readWorkspaceFile("src/shared/ui/app-text.tsx");
    const screenHeader = readWorkspaceFile("src/shared/ui/screen-header.tsx");

    expect(appText).toContain("useAppThemeColors()");
    expect(appText).toContain("themeColors.text");
    expect(appText).not.toContain("colors.");
    expect(screenHeader).toContain("useAppThemeColors()");
    expect(screenHeader).toContain("themeColors.background");
    expect(screenHeader).toContain("themeColors.text");
    expect(screenHeader).not.toContain("colors.");
  });

  it("select와 empty/retry state는 현재 테마 색 토큰을 사용한다", () => {
    const appSelectMenu = readWorkspaceFile(
      "src/shared/ui/app-select-menu.tsx"
    );
    const appState = readWorkspaceFile("src/shared/ui/app-state.tsx");

    expect(appSelectMenu).toContain("useAppThemeColors()");
    expect(appSelectMenu).toContain("themeColors.surface");
    expect(appSelectMenu).toContain("themeColors.dividerOnPrimary");
    expect(appSelectMenu).not.toContain("colors.");
    expect(appState).toContain("useAppThemeColors()");
    expect(appState).toContain("themeColors.surface");
    expect(appState).toContain("themeColors.primaryForeground");
    expect(appState).not.toContain("colors.");
  });
});
