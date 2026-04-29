import { StyleSheet, View } from "react-native";

import { borderRadius, color, spacing } from "~/design-system/tokens";

const PLACEHOLDER_ROW_COUNT = 4;

export function ReminderListLoadingPlaceholder(): React.JSX.Element {
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
    backgroundColor: color.smokyWhite,
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
    borderBottomColor: color.jetBlack,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  placeholderMeta: {
    backgroundColor: color.smokyWhite,
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
    backgroundColor: color.smokyWhite,
    borderRadius: borderRadius.pill,
    height: 23,
    width: "42%",
  },
  sortControlPlaceholder: {
    alignSelf: "flex-end",
    backgroundColor: color.smokyWhite,
    borderRadius: borderRadius.pill,
    height: 36,
    marginBottom: spacing.md,
    width: 144,
  },
});
