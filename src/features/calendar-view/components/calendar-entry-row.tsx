import { Pressable, StyleSheet, View } from "react-native";
import { ArrowRight } from "lucide-react-native";

import { AppText } from "~/design-system/components/app-text";
import { borderRadius, color, spacing } from "~/design-system/tokens";
import {
  type CalendarDayEntry,
  formatCalendarDayEntryMetaLine,
} from "~/features/calendar-view/calendar-screen.helpers";
import { recurringItemColorOptionByKey } from "~/features/recurring/domain/color-palette";

type CalendarEntryRowProps = {
  entry: CalendarDayEntry;
  isLast: boolean;
  onPress: () => void;
};

export function CalendarEntryRow({
  entry,
  isLast,
  onPress,
}: CalendarEntryRowProps): React.JSX.Element {
  const metaLine = formatCalendarDayEntryMetaLine(entry);
  const markerColor = recurringItemColorOptionByKey[entry.colorKey].swatchColor;

  return (
    <Pressable
      accessibilityHint="반복 항목 상세 화면으로 이동해요."
      accessibilityLabel={`${entry.title} 상세 보기`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.listItemRow,
        !isLast && styles.listItemDivider,
        pressed ? styles.pressed : undefined,
      ]}
    >
      <View style={styles.listItemCopy}>
        <View style={styles.listItemTitleRow}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.listItemColorMarker,
              { backgroundColor: markerColor },
            ]}
          />
          <AppText
            ellipsizeMode="tail"
            numberOfLines={1}
            style={styles.listItemText}
          >
            {entry.title}
          </AppText>
        </View>
        <View style={styles.listItemMetaSlot}>
          <AppText
            ellipsizeMode="tail"
            numberOfLines={1}
            style={styles.listItemMetaText}
            variant="caption"
          >
            {metaLine}
          </AppText>
        </View>
      </View>

      <View style={styles.listItemActionIcon}>
        <ArrowRight color={color.jetBlack} size={16} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listItemActionIcon: {
    alignItems: "center",
    borderColor: color.jetBlack,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  listItemCopy: {
    flex: 1,
    minWidth: 0,
  },
  listItemColorMarker: {
    borderRadius: borderRadius.pill,
    height: 10,
    width: 10,
  },
  listItemDivider: {
    borderBottomColor: color.jetBlack,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listItemMetaSlot: {
    marginTop: spacing.xxs,
  },
  listItemMetaText: {
    color: color.gray,
  },
  listItemRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  listItemText: {
    color: color.jetBlack,
    flex: 1,
    minWidth: 0,
  },
  listItemTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.72,
  },
});
