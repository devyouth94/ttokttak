import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";

import { AppStateView } from "~/design-system/components/app-state";
import { colors } from "~/design-system/tokens";

export function ReminderListEmptyState(): React.JSX.Element {
  return (
    <AppStateView
      action={{
        accessibilityHint: "일정 만들기 화면으로 이동해요.",
        accessibilityLabel: "일정 만들기",
        icon: <Plus color={colors.text} size={16} />,
        label: "일정 만들기",
        onPress: () => {
          router.push({
            params: { returnTo: "/schedule" },
            pathname: "/items/new",
          });
        },
      }}
      description="일정을 추가하면 이곳에서 한눈에 볼 수 있어요."
      style={styles.stateView}
      title="등록된 일정이 없어요"
    />
  );
}

export function ReminderListErrorState({
  onRetry,
}: {
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <AppStateView
      action={{
        accessibilityHint: "일정 목록 조회를 다시 시도해요.",
        accessibilityLabel: "일정 다시 불러오기",
        label: "다시 시도",
        onPress: onRetry,
      }}
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
