export const colors = {
  background: "#FAFAFB",
  surface: "#FFFFFF",

  primary: "#292B2D",
  primaryPressed: "#1C1F23",
  primaryForeground: "#FFFFFF",

  accent: "#E06A4F",
  accentSoft: "#FCEBE6",
  accentForeground: "#FFFFFF",

  text: "#1C1F23",
  textMuted: "#5B616B",
  textSoft: "#8A9099",

  error: "#D64545",
  errorContainer: "#FBE9E7",

  green: "#2E7D32",
  greenBorder: "#CFE7D2",
  greenSoft: "#DDEEDD",
  greenText: "#1F6B2A",

  amber: "#B8860B",
  amberBorder: "#E9D8AE",
  amberSoft: "#F6E8C8",
  amberText: "#7E5C08",

  gray: "#9AA3AD",
  grayBorder: "#D8DEE4",
  graySoft: "#E8ECEF",
  grayText: "#68727D",

  red: "#D64545",
  redBorder: "#F1C6C1",
  redSoft: "#F8DCD7",
  redText: "#A83636",

  blue: "#357ABD",

  dividerOnPrimary: "rgba(28, 31, 35, 0.4)",

  scrim: "rgba(28, 31, 35, 0.28)",
  shadow: "rgba(28, 31, 35, 0.08)",
} as const;

export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
} as const;

export const borderRadius = {
  xs: 2,
  sm: 6,
  md: 8,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  fontFamily: {
    body: "Pretendard",
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    black: "900",
  },
  letterSpacing: {
    normal: 0,
    tight: -0.2,
    display: 0,
    label: 0.4,
  },
  lineHeight: {
    caption: 15,
    label: 16,
    body3: 20,
    body: 23,
    title: 30,
    display: 36,
    headline: 44,
  },
  size: {
    caption: 11,
    label: 12,
    body3: 14,
    body: 16,
    title: 24,
    display: 32,
    headline: 40,
  },
  label: 12,
  body: 16,
  title: 24,
  display: 32,
} as const;
