import { forwardRef, useMemo } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";

import type { ThemeColors } from "~/theme/colors";
import { useThemeColors } from "~/theme/provider";
import { borderRadius, spacing, typography } from "~/ui/tokens";

type AppTextInputProps = TextInputProps & {
  error?: boolean;
  focused?: boolean;
};

export const AppTextInput = forwardRef<TextInput, AppTextInputProps>(
  function AppTextInput(
    { error = false, focused = false, placeholderTextColor, style, ...props },
    ref
  ): React.JSX.Element {
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);

    return (
      <TextInput
        {...props}
        placeholderTextColor={placeholderTextColor ?? themeColors.textMuted}
        ref={ref}
        style={[
          styles.input,
          style,
          focused ? styles.focused : undefined,
          error ? styles.error : undefined,
        ]}
      />
    );
  }
);

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
    error: {
      borderColor: themeColors.error,
    },
    focused: {
      borderColor: themeColors.primary,
    },
    input: {
      backgroundColor: "transparent",
      borderColor: themeColors.border,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      color: themeColors.text,
      fontFamily: typography.fontFamily.body,
      fontSize: typography.size.body3,
      lineHeight: typography.lineHeight.body3,
      minHeight: 48,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
  });
}
