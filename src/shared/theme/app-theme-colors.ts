import type { ResolvedAppTheme } from "./app-theme";

export type AppThemeColors = {
  accent: string;
  accentForeground: string;
  accentSoft: string;
  amber: string;
  amberBorder: string;
  amberSoft: string;
  amberText: string;
  background: string;
  blue: string;
  dividerOnPrimary: string;
  error: string;
  errorContainer: string;
  gray: string;
  grayBorder: string;
  graySoft: string;
  grayText: string;
  green: string;
  greenBorder: string;
  greenSoft: string;
  greenText: string;
  primary: string;
  primaryForeground: string;
  primaryPressed: string;
  red: string;
  redBorder: string;
  redSoft: string;
  redText: string;
  scrim: string;
  shadow: string;
  surface: string;
  text: string;
  textMuted: string;
  textSoft: string;
};

export const appThemeColors = {
  light: {
    accent: "#E06A4F",
    accentForeground: "#FFFFFF",
    accentSoft: "#FCEBE6",
    amber: "#B8860B",
    amberBorder: "#E9D8AE",
    amberSoft: "#F6E8C8",
    amberText: "#7E5C08",
    background: "#FAFAFB",
    blue: "#357ABD",
    dividerOnPrimary: "rgba(28, 31, 35, 0.4)",
    error: "#D64545",
    errorContainer: "#FBE9E7",
    gray: "#9AA3AD",
    grayBorder: "#D8DEE4",
    graySoft: "#E8ECEF",
    grayText: "#68727D",
    green: "#2E7D32",
    greenBorder: "#CFE7D2",
    greenSoft: "#DDEEDD",
    greenText: "#1F6B2A",
    primary: "#292B2D",
    primaryForeground: "#FFFFFF",
    primaryPressed: "#1C1F23",
    red: "#D64545",
    redBorder: "#F1C6C1",
    redSoft: "#F8DCD7",
    redText: "#A83636",
    scrim: "rgba(28, 31, 35, 0.28)",
    shadow: "rgba(28, 31, 35, 0.08)",
    surface: "#FFFFFF",
    text: "#1C1F23",
    textMuted: "#5B616B",
    textSoft: "#8A9099",
  },
  dark: {
    accent: "#E06A4F",
    accentForeground: "#FFFFFF",
    accentSoft: "#FCEBE6",
    amber: "#B8860B",
    amberBorder: "#E9D8AE",
    amberSoft: "#F6E8C8",
    amberText: "#7E5C08",
    background: "#111315",
    blue: "#357ABD",
    dividerOnPrimary: "rgba(244, 245, 246, 0.18)",
    error: "#D64545",
    errorContainer: "#3A1E1D",
    gray: "#9AA3AD",
    grayBorder: "#D8DEE4",
    graySoft: "#E8ECEF",
    grayText: "#68727D",
    green: "#2E7D32",
    greenBorder: "#CFE7D2",
    greenSoft: "#DDEEDD",
    greenText: "#1F6B2A",
    primary: "#F4F5F6",
    primaryForeground: "#111315",
    primaryPressed: "#D8DEE4",
    red: "#D64545",
    redBorder: "#F1C6C1",
    redSoft: "#F8DCD7",
    redText: "#A83636",
    scrim: "rgba(0, 0, 0, 0.58)",
    shadow: "rgba(0, 0, 0, 0.28)",
    surface: "#1A1D21",
    text: "#F4F5F6",
    textMuted: "#C2C7D0",
    textSoft: "#8D95A1",
  },
} as const satisfies Record<ResolvedAppTheme, AppThemeColors>;

export function getAppThemeColors(theme: ResolvedAppTheme): AppThemeColors {
  return appThemeColors[theme];
}
