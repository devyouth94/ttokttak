import { Platform } from "react-native";

export const colors = {
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
  outlineSoft: "#e0e0e0",
  shadow: "rgba(33, 33, 33, 0.08)",
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
} as const;

export const borderRadius = {
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  fontFamily: {
    body: Platform.select({
      ios: "goorm Sans Code",
      android: "goorm-sans-code",
      default: undefined,
    }),
  },
  label: 13,
  body: 15,
  title: 20,
  display: 30,
} as const;
