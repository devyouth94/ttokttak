import { StyleSheet, View } from "react-native";

import { borderRadius, colors, spacing } from "~/shared/ui/tokens";

const HOME_LOADING_PLACEHOLDER_ROW_COUNT = 3;

export function HomeLoadingPlaceholder(): React.JSX.Element {
  return (
    <View
      accessibilityLabel="홈 피드를 불러오는 중"
      accessibilityRole="progressbar"
      style={styles.placeholder}
    >
      <View style={styles.placeholderHeader} />
      {Array.from({ length: HOME_LOADING_PLACEHOLDER_ROW_COUNT }).map(
        (_, index) => (
          <View key={index} style={styles.placeholderRow}>
            <View style={styles.placeholderIcon} />
            <View style={styles.placeholderCopy}>
              <View style={styles.placeholderTitle} />
              <View style={styles.placeholderBody} />
            </View>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  placeholderBody: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: 16,
    marginBottom: spacing.xs,
    width: 112,
  },
  placeholderIcon: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: 28,
    width: 28,
  },
  placeholderRow: {
    alignItems: "center",
    borderBottomColor: colors.dividerOnPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 76,
    paddingVertical: spacing.sm,
  },
  placeholderTitle: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: 14,
    width: "72%",
  },
});
