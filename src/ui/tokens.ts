import { Platform } from "react-native";

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
    body: Platform.OS === "ios" ? "Pretendard Variable" : "Pretendard",
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
