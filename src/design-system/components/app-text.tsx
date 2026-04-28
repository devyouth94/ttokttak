import type { PropsWithChildren } from "react";
import {
  type StyleProp,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
} from "react-native";

import { color, colors, typography } from "~/design-system/tokens";

type AppTextVariant = "body" | "caption" | "display" | "label" | "title";

type AppTextProps = PropsWithChildren<
  Pick<TextProps, "ellipsizeMode" | "numberOfLines"> & {
    style?: StyleProp<TextStyle>;
    variant?: AppTextVariant;
  }
>;

export function AppText({
  children,
  ellipsizeMode,
  numberOfLines,
  style,
  variant = "body",
}: AppTextProps): React.JSX.Element {
  return (
    <Text
      ellipsizeMode={ellipsizeMode}
      numberOfLines={numberOfLines}
      style={[styles.base, styles[variant], style]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    fontFamily: typography.fontFamily.body,
  },
  body: {
    fontSize: typography.size.body,
    fontWeight: typography.fontWeight.regular,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: typography.lineHeight.body,
  },
  caption: {
    fontSize: typography.size.caption,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: typography.lineHeight.caption,
  },
  display: {
    color: color.jetBlack,
    fontSize: typography.size.display,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: typography.letterSpacing.display,
    lineHeight: typography.lineHeight.display,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.size.label,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.label,
    lineHeight: typography.lineHeight.label,
    textTransform: "uppercase",
  },
  title: {
    fontSize: typography.size.title,
    fontWeight: typography.fontWeight.regular,
    letterSpacing: typography.letterSpacing.tight,
    lineHeight: typography.lineHeight.title,
  },
});
