import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { spacing } from "~/ui/tokens";

export function ScheduleFormLoading(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: themeColors.background }]}
    >
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={themeColors.primary} size="large" />
        <AppText style={{ color: themeColors.textMuted }}>
          {t("scheduleForm.loading")}
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  safeArea: {
    flex: 1,
  },
});
