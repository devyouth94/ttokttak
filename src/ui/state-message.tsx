import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "~/shared/ui/app-text";
import { borderRadius, spacing } from "~/shared/ui/tokens";
import { useThemeColors } from "~/theme/context";

type StateAction = {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  icon?: ReactNode;
  label: string;
  onPress: () => void;
};

type StateMessageProps = {
  action?: StateAction;
  description?: string;
  style?: StyleProp<ViewStyle>;
  title: string;
};

export function StateMessage({
  action,
  description,
  style,
  title,
}: StateMessageProps): React.JSX.Element {
  const themeColors = useThemeColors();

  return (
    <View style={[styles.message, style]}>
      <View style={styles.copy}>
        <AppText
          style={[styles.title, { color: themeColors.text }]}
          variant="title"
        >
          {title}
        </AppText>
        {description && (
          <AppText
            style={[styles.description, { color: themeColors.textMuted }]}
          >
            {description}
          </AppText>
        )}
      </View>

      {action && (
        <Pressable
          accessibilityHint={action.accessibilityHint}
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.action,
            { borderColor: themeColors.border },
            pressed ? styles.pressed : undefined,
          ]}
        >
          {action.icon}
          <AppText
            style={[styles.actionText, { color: themeColors.text }]}
            variant="label"
          >
            {action.label}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionText: {
    letterSpacing: 0,
  },
  copy: {
    alignItems: "center",
    gap: spacing.xs,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  message: {
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.88,
  },
  title: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
  },
});
