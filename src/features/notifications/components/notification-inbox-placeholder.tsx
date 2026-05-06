import { StyleSheet, View } from "react-native";

import { borderRadius, colors, spacing } from "~/design-system/tokens";

const NOTIFICATION_PLACEHOLDER_ROW_COUNT = 5;

export function NotificationInboxPlaceholder(): React.JSX.Element {
  return (
    <View
      accessibilityLabel="알림을 불러오는 중"
      accessibilityRole="progressbar"
      style={styles.placeholder}
    >
      {Array.from({ length: NOTIFICATION_PLACEHOLDER_ROW_COUNT }).map(
        (_, index) => (
          <View
            key={index}
            style={[
              styles.row,
              index < NOTIFICATION_PLACEHOLDER_ROW_COUNT - 1
                ? styles.divider
                : undefined,
            ]}
          >
            <View style={styles.title} />
            <View style={styles.meta} />
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    borderBottomColor: colors.dividerOnPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meta: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: 15,
    width: "68%",
  },
  placeholder: {
    paddingHorizontal: spacing.md,
  },
  row: {
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
  },
  title: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: 23,
    width: "34%",
  },
});
