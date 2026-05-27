import {
  fallbackAppThemePreference,
  resolveAppTheme,
  resolveAppThemePreference,
  resolveInitialAppThemePreference,
} from "./app-theme";

describe("app theme preference", () => {
  it("테마 preference는 system, light, dark만 허용한다", () => {
    expect(
      resolveAppThemePreference({
        storedPreference: "system",
      })
    ).toBe("system");
    expect(resolveAppThemePreference({ storedPreference: "light" })).toBe(
      "light"
    );
    expect(resolveAppThemePreference({ storedPreference: "dark" })).toBe(
      "dark"
    );
    expect(resolveAppThemePreference({ storedPreference: "sepia" })).toBe(
      fallbackAppThemePreference
    );
  });

  it("저장된 preference가 없으면 system으로 동작한다", () => {
    expect(resolveAppThemePreference({ storedPreference: null })).toBe(
      fallbackAppThemePreference
    );
  });

  it("초기 저장값 읽기가 실패하면 system으로 동작한다", async () => {
    await expect(
      resolveInitialAppThemePreference({
        readStoredPreference: async () => {
          throw new Error("저장소 오류");
        },
      })
    ).resolves.toBe(fallbackAppThemePreference);
  });
});

describe("resolveAppTheme", () => {
  it("system은 현재 기기의 화면 표시 설정을 resolved theme으로 해석한다", () => {
    expect(resolveAppTheme({ colorScheme: "dark", preference: "system" })).toBe(
      "dark"
    );
    expect(
      resolveAppTheme({ colorScheme: "light", preference: "system" })
    ).toBe("light");
    expect(resolveAppTheme({ colorScheme: null, preference: "system" })).toBe(
      "light"
    );
  });

  it("light 또는 dark를 직접 고르면 기기 화면 표시 설정보다 우선한다", () => {
    expect(resolveAppTheme({ colorScheme: "dark", preference: "light" })).toBe(
      "light"
    );
    expect(resolveAppTheme({ colorScheme: "light", preference: "dark" })).toBe(
      "dark"
    );
  });
});
