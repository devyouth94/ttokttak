import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";
import { RotateCw } from "lucide-react-native";

import { useAppThemeColors } from "~/shared/theme";
import { AppRetryStatePanel } from "~/shared/ui/app-state";
import { spacing } from "~/shared/ui/tokens";

type HomeFeedErrorCardProps = {
  message: string;
  onRetry: () => void;
};

export function HomeFeedErrorCard({
  message,
  onRetry,
}: HomeFeedErrorCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useAppThemeColors();

  return (
    <AppRetryStatePanel
      description={message}
      minHeight={112}
      onRetry={onRetry}
      panelStyle={styles.errorCard}
      retryAccessibilityHint={t("home.feed.retryHint")}
      retryAccessibilityLabel={t("home.feed.retryLabel")}
      retryIcon={<RotateCw color={themeColors.text} size={16} />}
      title={t("home.feed.errorTitle")}
      variant="surface"
    />
  );
}

const styles = StyleSheet.create({
  errorCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
});
