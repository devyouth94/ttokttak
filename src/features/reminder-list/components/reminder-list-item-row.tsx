import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";

import { AppText } from "~/design-system/components/app-text";
import { borderRadius, colors, spacing } from "~/design-system/tokens";
import { recurringItemColorOptionByKey } from "~/features/recurring/domain/color-palette";

import type { ReminderListEntry } from "../reminder-list.helpers";

type ReminderListItemRowProps = {
  entry: ReminderListEntry;
  isLast: boolean;
};

export function ReminderListItemRow({
  entry,
  isLast,
}: ReminderListItemRowProps): React.JSX.Element {
  const metaLine = getReminderListItemMetaLine(entry);
  const markerColor = recurringItemColorOptionByKey[entry.colorKey].swatchColor;

  return (
    <Pressable
      accessibilityHint="일정 상세 화면으로 이동해요."
      accessibilityLabel={`${entry.title} 상세 보기`}
      accessibilityRole="button"
      onPress={() => {
        router.push({
          params: {
            itemId: entry.id,
            returnTo: "/schedule",
            ...(entry.nextScheduledAtUtc
              ? { scheduledAtUtc: entry.nextScheduledAtUtc }
              : {}),
          },
          pathname: "/items/[itemId]",
        });
      }}
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
        <ArrowRight color={colors.text} size={16} />
      </View>
    </Pressable>
  );
}

function getReminderListItemMetaLine(entry: ReminderListEntry): string {
  return [entry.nextOccurrenceTimeLabel, entry.recurrenceLabel].join(" · ");
}

const styles = StyleSheet.create({
  listItemColorMarker: {
    borderRadius: borderRadius.pill,
    height: 10,
    width: 10,
  },
  listItemActionIcon: {
    alignItems: "center",
    borderColor: colors.primary,
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
  listItemDivider: {
    borderBottomColor: colors.dividerOnPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listItemMetaSlot: {
    marginTop: spacing.xxs,
  },
  listItemMetaText: {
    color: colors.textSoft,
  },
  listItemRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  listItemText: {
    color: colors.text,
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
