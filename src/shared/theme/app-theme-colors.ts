import type { ResolvedAppTheme } from "./app-theme";

export type AppThemeColors = {
  background: string;
  surface: string;
};

export const appThemeColors = {
  light: {
    background: "#FAFAFB",
    surface: "#FFFFFF",
  },
  dark: {
    background: "#111315",
    surface: "#1A1D21",
  },
} as const satisfies Record<ResolvedAppTheme, AppThemeColors>;

export function getAppThemeColors(theme: ResolvedAppTheme): AppThemeColors {
  return appThemeColors[theme];
}
