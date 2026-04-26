import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, View } from "react-native";

import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "~/design-system/tokens";

import { AppText } from "./app-text";

type AppStateAction = {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  icon?: ReactNode;
  label: string;
  onPress: () => void;
};

type AppStateViewProps = {
  action?: AppStateAction;
  description?: string;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  title: string;
};

type AppStatePlaceholderProps = {
  rowCount?: number;
  showHeader?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppStateView({
  action,
  description,
  icon,
  style,
  title,
}: AppStateViewProps): React.JSX.Element {
  return (
    <View style={[styles.state, style]}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}

      <View style={styles.copy}>
        <AppText style={styles.title} variant="title">
          {title}
        </AppText>
        {description ? (
          <AppText style={styles.description}>{description}</AppText>
        ) : null}
      </View>

      {action ? (
        <Pressable
          accessibilityHint={action.accessibilityHint}
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.action,
            pressed ? styles.pressed : undefined,
          ]}
        >
          {action.icon}
          <AppText style={styles.actionText} variant="label">
            {action.label}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function AppStatePlaceholder({
  rowCount = 3,
  showHeader = false,
  style,
}: AppStatePlaceholderProps): React.JSX.Element {
  return (
    <View
      accessibilityLabel="내용을 불러오는 중"
      accessibilityRole="progressbar"
      style={[styles.placeholder, style]}
    >
      {showHeader ? <View style={styles.placeholderHeader} /> : null}
      {Array.from({ length: rowCount }).map((_, index) => (
        <View key={index} style={styles.placeholderRow}>
          <View style={styles.placeholderIcon} />
          <View style={styles.placeholderCopy}>
            <View style={styles.placeholderTitle} />
            <View style={styles.placeholderBody} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionText: {
    color: colors.text,
    fontSize: typography.label,
    letterSpacing: 0,
  },
  copy: {
    alignItems: "center",
    gap: spacing.xs,
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.surfaceHigh,
    borderRadius: borderRadius.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  placeholder: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  placeholderBody: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: borderRadius.pill,
    height: 12,
    width: "58%",
  },
  placeholderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  placeholderHeader: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceHigh,
    borderRadius: borderRadius.pill,
    height: 16,
    marginBottom: spacing.xs,
    width: 112,
  },
  placeholderIcon: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: borderRadius.pill,
    height: 28,
    width: 28,
  },
  placeholderRow: {
    alignItems: "center",
    borderBottomColor: colors.outlineSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 76,
    paddingVertical: spacing.sm,
  },
  placeholderTitle: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: borderRadius.pill,
    height: 14,
    width: "72%",
  },
  pressed: {
    opacity: 0.88,
  },
  state: {
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
  },
});
