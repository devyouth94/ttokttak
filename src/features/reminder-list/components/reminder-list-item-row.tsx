import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";

import { AppText } from "~/design-system/components/app-text";
import { borderRadius, color, spacing } from "~/design-system/tokens";

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
        <AppText
          ellipsizeMode="tail"
          numberOfLines={1}
          style={styles.listItemText}
        >
          {entry.title}
        </AppText>
        <View style={styles.listItemMetaSlot}>
          <AppText
            ellipsizeMode="tail"
            numberOfLines={1}
            style={styles.listItemText}
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

function getReminderListItemMetaLine(entry: ReminderListEntry): string {
  return [entry.nextOccurrenceTimeLabel, entry.recurrenceLabel].join(" · ");
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
  listItemDivider: {
    borderBottomColor: color.jetBlack,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listItemMetaSlot: {
    marginTop: spacing.xxs,
    opacity: 0.72,
  },
  listItemRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  listItemText: {
    color: color.jetBlack,
  },
  pressed: {
    opacity: 0.72,
  },
});
