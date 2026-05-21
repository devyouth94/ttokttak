import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";

import { AppEmptyStateView, AppRetryStateView } from "~/shared/ui/app-state";
import { colors } from "~/shared/ui/tokens";

export function ScheduleListEmptyState(): React.JSX.Element {
  return (
    <AppEmptyStateView
      action={{
        accessibilityHint: "일정 만들기 화면으로 이동해요.",
        accessibilityLabel: "일정 만들기",
        icon: <Plus color={colors.primaryForeground} size={16} />,
        label: "일정 만들기",
        onPress: () => {
          router.push({
            params: { returnTo: "/schedule" },
            pathname: "/items/new",
          });
        },
      }}
      style={styles.stateView}
      title="등록된 일정이 없어요"
    />
  );
}

export function ScheduleListErrorState({
  onRetry,
}: {
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <AppRetryStateView
      onRetry={onRetry}
      retryAccessibilityHint="일정 목록 조회를 다시 시도해요."
      retryAccessibilityLabel="일정 다시 불러오기"
      style={styles.stateView}
      title="일정을 불러오지 못했어요"
    />
  );
}

const styles = StyleSheet.create({
  stateView: {
    minHeight: 240,
  },
});
