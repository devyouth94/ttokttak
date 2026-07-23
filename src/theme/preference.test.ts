import { resolveTheme, resolveThemePreference } from "./preference";

describe("theme preference", () => {
  it("테마 preference는 system, light, dark만 허용한다", () => {
    expect(
      ["system", "light", "dark", "sepia", null].map(resolveThemePreference)
    ).toEqual(["system", "light", "dark", "system", "system"]);
  });
});

describe("resolveTheme", () => {
  it("system은 기기 설정을 따르고 직접 선택한 테마는 우선한다", () => {
    expect([
      resolveTheme({ colorScheme: "dark", preference: "system" }),
      resolveTheme({ colorScheme: "light", preference: "system" }),
      resolveTheme({ colorScheme: null, preference: "system" }),
      resolveTheme({ colorScheme: "dark", preference: "light" }),
      resolveTheme({ colorScheme: "light", preference: "dark" }),
    ]).toEqual(["dark", "light", "light", "light", "dark"]);
  });
});
