import { Pressable, StyleSheet } from "react-native";
import { ArrowLeft, ListChecks, X } from "lucide-react-native";

import { IconButton } from "~/design-system/components/icon-button";
import { ScreenHeader } from "~/design-system/components/screen-header";
import { borderRadius, colors } from "~/design-system/tokens";

type NotificationInboxHeaderProps = {
  disabled: boolean;
  isSelectionMode: boolean;
  onBack: () => void;
  onToggleSelectionMode: () => void;
};

export function NotificationInboxHeader({
  disabled,
  isSelectionMode,
  onBack,
  onToggleSelectionMode,
}: NotificationInboxHeaderProps): React.JSX.Element {
  const actionLabel = isSelectionMode ? "선택 취소" : "알림 선택";
  const ActionIcon = isSelectionMode ? X : ListChecks;

  return (
    <ScreenHeader
      leftSlot={
        <Pressable
          accessibilityHint="이전 화면으로 돌아가요."
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? styles.pressed : undefined,
          ]}
        >
          <ArrowLeft color={colors.primaryForeground} size={18} />
        </Pressable>
      }
      rightSlot={
        <IconButton
          accessibilityLabel={actionLabel}
          disabled={disabled}
          icon={<ActionIcon color={colors.text} size={20} />}
          onPress={onToggleSelectionMode}
          size="lg"
        />
      }
      title="알림"
    />
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  pressed: {
    opacity: 0.88,
  },
});
