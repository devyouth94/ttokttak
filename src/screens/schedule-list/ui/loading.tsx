import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { borderRadius, spacing } from "~/shared/ui/tokens";
import { useThemeColors } from "~/theme/provider";

const PLACEHOLDER_ROW_COUNT = 4;

export function ListLoading(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();

  const placeholderStyle = { backgroundColor: themeColors.surface };

  return (
    <View
      accessibilityLabel={t("scheduleList.loadingA11yLabel")}
      accessibilityRole="progressbar"
    >
      <View style={[styles.sortControl, placeholderStyle]} />

      {Array.from({ length: PLACEHOLDER_ROW_COUNT }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.row,
            index < PLACEHOLDER_ROW_COUNT - 1
              ? [styles.divider, { borderBottomColor: themeColors.divider }]
              : undefined,
          ]}
        >
          <View style={styles.copy}>
            <View style={[styles.title, placeholderStyle]} />
            <View style={[styles.meta, placeholderStyle]} />
          </View>
          <View style={[styles.action, placeholderStyle]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    borderRadius: borderRadius.pill,
    height: 34,
    width: 34,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meta: {
    borderRadius: borderRadius.pill,
    height: 15,
    opacity: 0.72,
    width: "56%",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  sortControl: {
    alignSelf: "flex-end",
    borderRadius: borderRadius.pill,
    height: 36,
    marginBottom: spacing.md,
    width: 144,
  },
  title: {
    borderRadius: borderRadius.pill,
    height: 23,
    width: "42%",
  },
});
