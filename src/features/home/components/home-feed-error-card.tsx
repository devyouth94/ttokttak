import { StyleSheet, View } from "react-native";
import { RotateCw } from "lucide-react-native";

import { AppStateView } from "~/design-system/components/app-state";
import { colors, spacing } from "~/design-system/tokens";

type HomeFeedErrorCardProps = {
  message: string;
  onRetry: () => void;
};

export function HomeFeedErrorCard({
  message,
  onRetry,
}: HomeFeedErrorCardProps): React.JSX.Element {
  return (
    <View style={styles.errorCard}>
      <AppStateView
        action={{
          accessibilityHint: "일정을 다시 불러와요.",
          accessibilityLabel: "일정 다시 시도",
          icon: <RotateCw color={colors.text} size={16} />,
          label: "다시 시도",
          onPress: onRetry,
        }}
        description={message}
        style={styles.errorState}
        title="일정을 불러오지 못했어요"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  errorState: {
    minHeight: 112,
  },
});
