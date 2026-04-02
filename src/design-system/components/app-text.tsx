import type { PropsWithChildren } from "react";
import { StyleSheet, Text, type TextStyle } from "react-native";

import { colors, typography } from "~/design-system/tokens";

type AppTextVariant = "body" | "display" | "label" | "title";

type AppTextProps = PropsWithChildren<{
  style?: TextStyle;
  variant?: AppTextVariant;
}>;

export function AppText({
  children,
  style,
  variant = "body",
}: AppTextProps): React.JSX.Element {
  return <Text style={[styles.base, styles[variant], style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    fontFamily: typography.fontFamily.body,
  },
  body: {
    fontSize: typography.body,
    lineHeight: 22,
  },
  display: {
    fontSize: typography.display,
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.label,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: typography.title,
    lineHeight: 28,
  },
});
