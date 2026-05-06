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

  statusCompleted: "#2E7D32",
  statusCompletedBorder: "#CFE7D2",
  statusCompletedSoft: "#DDEEDD",
  statusCompletedText: "#1F6B2A",

  statusScheduled: "#B8860B",
  statusScheduledBorder: "#E9D8AE",
  statusScheduledSoft: "#F6E8C8",
  statusScheduledText: "#7E5C08",

  statusSkipped: "#9AA3AD",
  statusSkippedBorder: "#D8DEE4",
  statusSkippedSoft: "#E8ECEF",
  statusSkippedText: "#68727D",

  statusOverdue: "#D64545",
  statusOverdueBorder: "#F1C6C1",
  statusOverdueSoft: "#F8DCD7",
  statusOverdueText: "#A83636",

  weekendSunday: "#D64545",
  weekendSaturday: "#357ABD",

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

export const elevation = {
  flat: {
    android: 0,
    shadowColor: "transparent",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  surface: {
    android: 2,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  floating: {
    android: 4,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  nav: {
    android: 10,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: -6,
    },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
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
