import { Pressable, StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";

import { AppText } from "~/design-system/components/app-text";
import { borderRadius, color, spacing } from "~/design-system/tokens";

type NotificationInboxSelectionToolbarProps = {
  hasSelection: boolean;
  isDeleting: boolean;
  isMarkingRead: boolean;
  isSelectedAll: boolean;
  onDeleteSelected: () => void;
  onMarkSelectedRead: () => void;
  onToggleSelectAll: () => void;
};

export function NotificationInboxSelectionToolbar({
  hasSelection,
  isDeleting,
  isMarkingRead,
  isSelectedAll,
  onDeleteSelected,
  onMarkSelectedRead,
  onToggleSelectAll,
}: NotificationInboxSelectionToolbarProps): React.JSX.Element {
  const isActionPending = isDeleting || isMarkingRead;

  return (
    <View style={styles.toolbar}>
      <Pressable
        accessibilityLabel={isSelectedAll ? "전체 선택 해제" : "전체 선택"}
        accessibilityRole="checkbox"
        accessibilityState={{
          checked: isSelectedAll,
        }}
        disabled={isActionPending}
        hitSlop={8}
        onPress={onToggleSelectAll}
        style={({ pressed }) => [
          styles.selectAllButton,
          isActionPending ? styles.disabled : undefined,
          pressed ? styles.pressed : undefined,
        ]}
      >
        <View
          style={[
            styles.check,
            isSelectedAll ? styles.checkSelected : undefined,
          ]}
        >
          {isSelectedAll ? <Check color={color.white} size={12} /> : null}
        </View>
        <AppText
          style={[
            styles.selectAllText,
            isActionPending ? styles.selectAllTextDisabled : undefined,
          ]}
          variant="label"
        >
          {isSelectedAll ? "전체 해제" : "전체 선택"}
        </AppText>
      </Pressable>

      {hasSelection ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel="선택 알림 읽음"
            accessibilityRole="button"
            disabled={isActionPending}
            hitSlop={8}
            onPress={onMarkSelectedRead}
            style={({ pressed }) => [
              styles.actionButton,
              styles.markReadButton,
              isActionPending ? styles.disabled : undefined,
              pressed ? styles.pressed : undefined,
            ]}
          >
            <AppText style={styles.markReadText} variant="label">
              {isMarkingRead ? "처리 중" : "읽음"}
            </AppText>
          </Pressable>

          <Pressable
            accessibilityLabel="선택 알림 삭제"
            accessibilityRole="button"
            disabled={isActionPending}
            hitSlop={8}
            onPress={onDeleteSelected}
            style={({ pressed }) => [
              styles.actionButton,
              styles.deleteButton,
              isActionPending ? styles.disabled : undefined,
              pressed ? styles.pressed : undefined,
            ]}
          >
            <AppText style={styles.deleteText} variant="label">
              {isDeleting ? "삭제 중" : "삭제"}
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 58,
    paddingHorizontal: spacing.md,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  check: {
    alignItems: "center",
    borderColor: color.jetBlack,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  checkSelected: {
    backgroundColor: color.jetBlack,
    borderColor: color.jetBlack,
  },
  deleteButton: {
    borderColor: color.jetBlack,
  },
  deleteText: {
    color: color.jetBlack,
  },
  disabled: {
    opacity: 0.5,
  },
  markReadButton: {
    backgroundColor: color.jetBlack,
    borderColor: color.jetBlack,
  },
  markReadText: {
    color: color.white,
  },
  pressed: {
    opacity: 0.88,
  },
  selectAllButton: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 34,
  },
  selectAllText: {
    color: color.jetBlack,
  },
  selectAllTextDisabled: {
    color: color.gray,
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
