import { getAppThemeColors } from "./app-theme-colors";

describe("app theme colors", () => {
  it("resolved theme별 기본 semantic color token을 제공한다", () => {
    expect(getAppThemeColors("light")).toMatchObject({
      background: "#FAFAFB",
      border: "rgba(28, 31, 35, 0.4)",
      controlTrack: "rgba(28, 31, 35, 0.4)",
      divider: "rgba(28, 31, 35, 0.4)",
      primary: "#292B2D",
      primaryForeground: "#FFFFFF",
      surface: "#FFFFFF",
      text: "#1C1F23",
      textDisabled: "rgba(28, 31, 35, 0.4)",
    });
    expect(getAppThemeColors("dark")).toMatchObject({
      background: "#111315",
      border: "rgba(244, 245, 246, 0.18)",
      controlTrack: "rgba(244, 245, 246, 0.18)",
      divider: "rgba(244, 245, 246, 0.18)",
      primary: "#F4F5F6",
      primaryForeground: "#111315",
      surface: "#1A1D21",
      text: "#F4F5F6",
      textDisabled: "rgba(244, 245, 246, 0.18)",
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
