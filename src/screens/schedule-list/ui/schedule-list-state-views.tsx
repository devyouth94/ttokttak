import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";

import { useAppThemeColors } from "~/shared/theme/theme-context";
import { AppEmptyStateView, AppRetryStateView } from "~/shared/ui/app-state";

export function ScheduleListEmptyState(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useAppThemeColors();

  return (
    <AppEmptyStateView
      action={{
        accessibilityHint: t("scheduleList.empty.createHint"),
        accessibilityLabel: t("scheduleList.empty.createLabel"),
        icon: <Plus color={themeColors.primaryForeground} size={16} />,
        label: t("scheduleList.empty.createLabel"),
        onPress: () => {
          router.push({
            params: { returnTo: "/schedule" },
            pathname: "/items/new",
          });
        },
      }}
      style={styles.stateView}
      title={t("scheduleList.empty.title")}
    />
  );
}

export function ScheduleListErrorState({
  onRetry,
}: {
  onRetry: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <AppRetryStateView
      onRetry={onRetry}
      retryAccessibilityHint={t("scheduleList.error.retryHint")}
      retryAccessibilityLabel={t("scheduleList.error.retryLabel")}
      style={styles.stateView}
      title={t("scheduleList.error.title")}
    />
  );
}

const styles = StyleSheet.create({
  stateView: {
    minHeight: 240,
  },
});
