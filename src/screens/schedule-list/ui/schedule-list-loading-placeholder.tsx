import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { useAppThemeColors } from "~/shared/theme/theme-context";
import { borderRadius, spacing } from "~/shared/ui/tokens";

const PLACEHOLDER_ROW_COUNT = 4;

export function ScheduleListLoadingPlaceholder(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useAppThemeColors();
  const placeholderStyle = { backgroundColor: themeColors.surface };

  return (
    <View
      accessibilityLabel={t("scheduleList.loadingA11yLabel")}
      accessibilityRole="progressbar"
    >
      <View style={[styles.sortControlPlaceholder, placeholderStyle]} />
      {Array.from({ length: PLACEHOLDER_ROW_COUNT }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.placeholderRow,
            index < PLACEHOLDER_ROW_COUNT - 1
              ? [
                  styles.placeholderDivider,
                  { borderBottomColor: themeColors.dividerOnPrimary },
                ]
              : undefined,
          ]}
        >
          <View style={styles.placeholderCopy}>
            <View style={[styles.placeholderTitle, placeholderStyle]} />
            <View style={[styles.placeholderMeta, placeholderStyle]} />
          </View>
          <View style={[styles.placeholderAction, placeholderStyle]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholderAction: {
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  placeholderMeta: {
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
    borderRadius: borderRadius.pill,
    height: 23,
    width: "42%",
  },
  sortControlPlaceholder: {
    alignSelf: "flex-end",
    borderRadius: borderRadius.pill,
    height: 36,
    marginBottom: spacing.md,
    width: 144,
  },
});
