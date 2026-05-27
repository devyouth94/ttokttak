import { getAppThemeColors } from "./app-theme-colors";

describe("app theme colors", () => {
  it("resolved theme별 기본 background와 surface를 제공한다", () => {
    expect(getAppThemeColors("light")).toEqual({
      background: "#FAFAFB",
      surface: "#FFFFFF",
    });
    expect(getAppThemeColors("dark")).toEqual({
      background: "#111315",
      surface: "#1A1D21",
    });
  });
});
