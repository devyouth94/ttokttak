import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { useAppThemeColors } from "~/shared/theme/theme-context";
import { borderRadius, spacing } from "~/shared/ui/tokens";

const HOME_LOADING_PLACEHOLDER_ROW_COUNT = 3;

export function HomeLoadingPlaceholder(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useAppThemeColors();

  return (
    <View
      accessibilityLabel={t("home.feed.loadingA11yLabel")}
      accessibilityRole="progressbar"
      style={styles.placeholder}
    >
      <View
        style={[
          styles.placeholderHeader,
          { backgroundColor: themeColors.surface },
        ]}
      />
      {Array.from({ length: HOME_LOADING_PLACEHOLDER_ROW_COUNT }).map(
        (_, index) => (
          <View
            key={index}
            style={[
              styles.placeholderRow,
              { borderBottomColor: themeColors.dividerOnPrimary },
            ]}
          >
            <View
              style={[
                styles.placeholderIcon,
                { backgroundColor: themeColors.surface },
              ]}
            />
            <View style={styles.placeholderCopy}>
              <View
                style={[
                  styles.placeholderTitle,
                  { backgroundColor: themeColors.surface },
                ]}
              />
              <View
                style={[
                  styles.placeholderBody,
                  { backgroundColor: themeColors.surface },
                ]}
              />
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
    borderRadius: borderRadius.pill,
    height: 16,
    marginBottom: spacing.xs,
    width: 112,
  },
  placeholderIcon: {
    borderRadius: borderRadius.pill,
    height: 28,
    width: 28,
  },
  placeholderRow: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 76,
    paddingVertical: spacing.sm,
  },
  placeholderTitle: {
    borderRadius: borderRadius.pill,
    height: 14,
    width: "72%",
  },
});
