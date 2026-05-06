import type { PropsWithChildren } from "react";
import {
  type StyleProp,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
} from "react-native";

import { colors, typography } from "~/design-system/tokens";

type AppTextVariant =
  | "body"
  | "body2"
  | "body3"
  | "caption"
  | "display"
  | "label"
  | "title";

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
  body2: {
    fontSize: typography.size.body,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: typography.lineHeight.body,
  },
  body3: {
    fontSize: typography.size.body3,
    fontWeight: typography.fontWeight.regular,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: typography.lineHeight.body3,
  },
  caption: {
    fontSize: typography.size.caption,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: typography.lineHeight.caption,
  },
  display: {
    color: colors.text,
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
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: typography.letterSpacing.tight,
    lineHeight: typography.lineHeight.title,
  },
});
