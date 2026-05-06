import { StyleSheet } from "react-native";
import { Bell } from "lucide-react-native";

import { AppStateView } from "~/design-system/components/app-state";
import { colors } from "~/design-system/tokens";

type NotificationInboxErrorStateProps = {
  onRetry: () => void;
};

export function NotificationInboxEmptyState(): React.JSX.Element {
  return (
    <AppStateView
      description="성공적으로 발송된 원격 푸시 알림이 이곳에 표시돼요."
      icon={<Bell color={colors.textSoft} size={20} />}
      style={styles.stateView}
      title="받은 알림이 없어요"
    />
  );
}

export function NotificationInboxErrorState({
  onRetry,
}: NotificationInboxErrorStateProps): React.JSX.Element {
  return (
    <AppStateView
      action={{
        accessibilityHint: "알림 목록 조회를 다시 시도해요.",
        accessibilityLabel: "알림 다시 불러오기",
        label: "다시 시도",
        onPress: onRetry,
      }}
      style={styles.stateView}
      title="알림을 불러오지 못했어요"
    />
  );
}

const styles = StyleSheet.create({
  stateView: {
    minHeight: 240,
  },
});
