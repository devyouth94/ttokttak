import { StyleSheet } from "react-native";
import { RotateCw } from "lucide-react-native";

import { AppRetryStatePanel } from "~/shared/ui/app-state";
import { colors, spacing } from "~/shared/ui/tokens";

type HomeFeedErrorCardProps = {
  message: string;
  onRetry: () => void;
};

export function HomeFeedErrorCard({
  message,
  onRetry,
}: HomeFeedErrorCardProps): React.JSX.Element {
  return (
    <AppRetryStatePanel
      description={message}
      minHeight={112}
      onRetry={onRetry}
      panelStyle={styles.errorCard}
      retryAccessibilityHint="일정을 다시 불러와요."
      retryAccessibilityLabel="일정 다시 시도"
      retryIcon={<RotateCw color={colors.text} size={16} />}
      title="일정을 불러오지 못했어요"
      variant="surface"
    />
  );
}

const styles = StyleSheet.create({
  errorCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
});
