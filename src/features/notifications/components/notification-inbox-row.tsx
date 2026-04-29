import { Pressable, StyleSheet, View } from "react-native";
import { ko } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import { Check } from "lucide-react-native";

import { AppText } from "~/design-system/components/app-text";
import { borderRadius, color, spacing } from "~/design-system/tokens";
import type { NotificationInboxItem } from "~/features/notifications/notification-inbox-repository";

type NotificationInboxRowProps = {
  isSelected: boolean;
  isSelectionMode: boolean;
  item: NotificationInboxItem;
  onPress: (item: NotificationInboxItem) => void;
  timezone: string;
};

export function NotificationInboxRow({
  isSelected,
  isSelectionMode,
  item,
  onPress,
  timezone,
}: NotificationInboxRowProps): React.JSX.Element {
  const isUnread = !item.readAt;
  const metaLine = [
    item.body,
    formatInboxDateLabel(item.deliveredAtUtc, timezone),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      accessibilityHint={
        isSelectionMode
          ? "선택 상태를 바꿔요."
          : "알림과 연결된 일정 상세 화면으로 이동해요."
      }
      accessibilityLabel={
        isSelectionMode
          ? `${item.title} 알림 ${isSelected ? "선택 해제" : "선택"}`
          : `${item.title} 알림 상세 보기`
      }
      accessibilityRole={isSelectionMode ? "checkbox" : "button"}
      accessibilityState={
        isSelectionMode
          ? {
              checked: isSelected,
            }
          : undefined
      }
      onPress={() => {
        onPress(item);
      }}
      style={({ pressed }) => [
        styles.row,
        pressed ? styles.pressed : undefined,
      ]}
    >
      {isSelectionMode ? (
        <View
          style={[
            styles.selectionIndicator,
            isSelected ? styles.selectionIndicatorSelected : undefined,
          ]}
        >
          {isSelected ? <Check color={color.white} size={13} /> : null}
        </View>
      ) : null}

      <View style={styles.copy}>
        <AppText
          ellipsizeMode="tail"
          numberOfLines={1}
          style={isUnread ? styles.titleUnread : styles.titleRead}
          variant={isUnread ? "body2" : "body"}
        >
          {item.title}
        </AppText>

        <AppText
          ellipsizeMode="tail"
          numberOfLines={1}
          style={styles.body}
          variant="caption"
        >
          {metaLine}
        </AppText>
      </View>

      <View style={styles.unreadStateSlot}>
        {isUnread ? <View style={styles.unreadDot} /> : null}
      </View>
    </Pressable>
  );
}

function formatInboxDateLabel(utcDateTime: string, timezone: string): string {
  return formatInTimeZone(utcDateTime, timezone, "M월 d일 EEE a h:mm", {
    locale: ko,
  });
}

const styles = StyleSheet.create({
  body: {
    color: color.gray,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.88,
  },
  row: {
    alignItems: "center",
    borderBottomColor: color.jetBlack,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  selectionIndicator: {
    alignItems: "center",
    borderColor: color.jetBlack,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  selectionIndicatorSelected: {
    backgroundColor: color.jetBlack,
    borderColor: color.jetBlack,
  },
  titleRead: {
    color: color.gray,
  },
  titleUnread: {
    color: color.jetBlack,
  },
  unreadDot: {
    backgroundColor: color.salmonOrange,
    borderRadius: borderRadius.pill,
    height: 6,
    width: 6,
  },
  unreadStateSlot: {
    alignItems: "center",
    justifyContent: "center",
    width: 10,
  },
});
