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

describe("AppThemeProvider", () => {
  it("저장된 테마 preference를 읽고 system fallback으로 초기화한다", () => {
    const provider = readWorkspaceFile("src/shared/theme/theme-provider.tsx");

    expect(provider).toContain("resolveInitialAppThemePreference");
    expect(provider).toContain("readStoredAppThemePreference");
    expect(provider).toContain("fallbackAppThemePreference");
  });

  it("system 테마는 기기 화면 표시 설정 변경을 provider에서 해석한다", () => {
    const provider = readWorkspaceFile("src/shared/theme/theme-provider.tsx");

    expect(provider).toContain("useColorScheme()");
    expect(provider).toContain("resolveAppTheme({");
    expect(provider).toContain("colorScheme");
  });

  it("테마 preference 변경 실패 시 저장값과 런타임 적용이 갈라지지 않게 change flow를 사용한다", () => {
    const provider = readWorkspaceFile("src/shared/theme/theme-provider.tsx");

    expect(provider).toContain("changeAppThemePreference");
    expect(provider).toContain("currentPreference: themePreferenceRef.current");
    expect(provider).toContain("setThemePreferenceState(preference)");
  });
});
