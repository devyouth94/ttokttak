import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";
import { RotateCw } from "lucide-react-native";

import { useThemeColors } from "~/theme/provider";
import { StateMessage } from "~/ui/state-message";
import { spacing } from "~/ui/tokens";

type HomeFeedErrorProps = {
  message: string;
  onRetry: () => void;
};

export function HomeFeedError({
  message,
  onRetry,
}: HomeFeedErrorProps): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();

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
