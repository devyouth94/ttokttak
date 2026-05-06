import { StyleSheet } from "react-native";

import {
  AppEmptyStateView,
  AppStateView,
} from "~/design-system/components/app-state";

type NotificationInboxErrorStateProps = {
  onRetry: () => void;
};

export function NotificationInboxEmptyState(): React.JSX.Element {
  return (
    <AppEmptyStateView style={styles.stateView} title="받은 알림이 없어요" />
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
