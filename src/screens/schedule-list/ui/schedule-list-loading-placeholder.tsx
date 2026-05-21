import { StyleSheet, View } from "react-native";

import { borderRadius, colors, spacing } from "~/shared/ui/tokens";

const PLACEHOLDER_ROW_COUNT = 4;

export function ScheduleListLoadingPlaceholder(): React.JSX.Element {
  return (
    <View>
      <View style={styles.sortControlPlaceholder} />
      {Array.from({ length: PLACEHOLDER_ROW_COUNT }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.placeholderRow,
            index < PLACEHOLDER_ROW_COUNT - 1
              ? styles.placeholderDivider
              : undefined,
          ]}
        >
          <View style={styles.placeholderCopy}>
            <View style={styles.placeholderTitle} />
            <View style={styles.placeholderMeta} />
          </View>
          <View style={styles.placeholderAction} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholderAction: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: 34,
    width: 34,
  },
  placeholderCopy: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
  },
  placeholderDivider: {
    borderBottomColor: colors.dividerOnPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  placeholderMeta: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: 15,
    opacity: 0.72,
    width: "56%",
  },
  placeholderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  placeholderTitle: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: 23,
    width: "42%",
  },
  sortControlPlaceholder: {
    alignSelf: "flex-end",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: 36,
    marginBottom: spacing.md,
    width: 144,
  },
});
