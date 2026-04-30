export const color = {
  white: "#FFFFFF",
  smokyWhite: "#EFF0F6",
  gray: "#8F9295",
  purple: "#D9B8F3",
  oldFlax: "#DFF37D",
  jetBlack: "#292B2D",
  royalBlue: "#4558C8",
  salmonOrange: "#EE5E37",
} as const;

export const legacyColors = {
  background: "#FFFFFF",
  surface: "#ffffff",
  surfaceLow: "#f9f9f9",
  surfaceContainer: "#fafafa",
  surfaceHigh: "#f5f5f5",
  primary: "#605f5f",
  primaryForeground: "#ffffff",
  text: "#212121",
  textMuted: "#757575",
  textSoft: "#757575",
  secondary: "#516455",
  secondaryContainer: "#e8f5e9",
  secondaryForeground: "#1b5e20",
  tertiary: "#635c71",
  tertiaryContainer: "#f3e5f5",
  error: "#ac3434",
  errorContainer: "#f56965",
  statusCompleted: "#4F7A5A",
  statusCompletedSoft: "#E8F5E9",
  statusCompletedText: "#1B5E20",
  statusScheduled: "#A9A9A9",
  statusScheduledSoft: "#F3F4F6",
  statusScheduledText: "#5F6368",
  statusSkipped: "#D9822B",
  statusSkippedSoft: "#FFF1E3",
  statusSkippedText: "#A35A16",
  statusOverdue: "#C94F4F",
  statusOverdueSoft: "#FDECEC",
  statusOverdueText: "#A53434",
  weekendSunday: "#C94F4F",
  weekendSaturday: "#4A79C9",
  outlineSoft: "#e0e0e0",
  shadow: "rgba(33, 33, 33, 0.08)",
} as const;

export const colors = {
  ...legacyColors,
  legacy: legacyColors,
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
    shadowColor: "rgba(0, 0, 0, 0.08)",
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
