import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";
import { RotateCw } from "lucide-react-native";

import { useAppThemeColors } from "~/shared/theme";
import { spacing } from "~/shared/ui/tokens";
import { StateMessage } from "~/ui/state-message";

type HomeFeedErrorProps = {
  message: string;
  onRetry: () => void;
};

export function HomeFeedError({
  message,
  onRetry,
}: HomeFeedErrorProps): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useAppThemeColors();

  return (
    <StateMessage
      action={{
        accessibilityHint: t("home.feed.retryHint"),
        accessibilityLabel: t("home.feed.retryLabel"),
        icon: <RotateCw color={themeColors.text} size={16} />,
        label: t("home.feed.retryLabel"),
        onPress: onRetry,
      }}
      description={message}
      style={styles.error}
      title={t("home.feed.errorTitle")}
    />
  );
}

const styles = StyleSheet.create({
  error: {
    flex: 0,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    minHeight: 112,
  },
});
