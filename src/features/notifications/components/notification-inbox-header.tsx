import { Pressable, StyleSheet, View } from "react-native";
import { ArrowLeft, ListChecks, X } from "lucide-react-native";

import { AppText } from "~/design-system/components/app-text";
import { IconButton } from "~/design-system/components/icon-button";
import { borderRadius, color, spacing } from "~/design-system/tokens";

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
    <View style={styles.header}>
      <View style={styles.titleGroup}>
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
          <ArrowLeft color={color.white} size={18} />
        </Pressable>
        <AppText
          ellipsizeMode="tail"
          numberOfLines={1}
          style={styles.title}
          variant="display"
        >
          알림
        </AppText>
      </View>

      <IconButton
        accessibilityLabel={actionLabel}
        disabled={disabled}
        icon={<ActionIcon color={color.jetBlack} size={20} />}
        onPress={onToggleSelectionMode}
        size="lg"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: color.jetBlack,
    borderRadius: borderRadius.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  pressed: {
    opacity: 0.88,
  },
  title: {
    color: color.jetBlack,
  },
  titleGroup: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
    minWidth: 0,
  },
});
