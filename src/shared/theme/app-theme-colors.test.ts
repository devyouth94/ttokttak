import { getAppThemeColors } from "./app-theme-colors";

describe("app theme colors", () => {
  it("resolved theme별 기본 semantic color token을 제공한다", () => {
    expect(getAppThemeColors("light")).toMatchObject({
      background: "#FAFAFB",
      primary: "#292B2D",
      primaryForeground: "#FFFFFF",
      surface: "#FFFFFF",
      text: "#1C1F23",
    });
    expect(getAppThemeColors("dark")).toMatchObject({
      background: "#111315",
      primary: "#F4F5F6",
      primaryForeground: "#111315",
      surface: "#1A1D21",
      text: "#F4F5F6",
    });
  });

  it("무채색이 아닌 주요 색은 resolved theme과 무관하게 유지한다", () => {
    expect(getAppThemeColors("dark")).toMatchObject({
      accent: getAppThemeColors("light").accent,
      blue: getAppThemeColors("light").blue,
      error: getAppThemeColors("light").error,
    });
  });
});
