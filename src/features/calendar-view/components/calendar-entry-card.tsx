import { Pressable, StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { AppText } from "~/design-system/components/app-text";
import { borderRadius, colors, spacing } from "~/design-system/tokens";
import type { CalendarDayEntry } from "~/features/calendar-view/calendar-screen.helpers";

type CalendarEntryCardProps = {
  entry: CalendarDayEntry;
  onPress: () => void;
};

const statusStyleByType = {
  completed: {
    backgroundColor: colors.statusCompletedSoft,
    borderColor: "#D3E8D6",
    textColor: colors.statusCompletedText,
  },
  overdue: {
    backgroundColor: colors.statusOverdueSoft,
    borderColor: "#F3CBCB",
    textColor: colors.statusOverdueText,
  },
  scheduled: {
    backgroundColor: colors.statusScheduledSoft,
    borderColor: "#E0E0E0",
    textColor: colors.statusScheduledText,
  },
  skipped: {
    backgroundColor: colors.statusSkippedSoft,
    borderColor: "#F6D8BC",
    textColor: colors.statusSkippedText,
  },
} as const;

export function CalendarEntryCard({
  entry,
  onPress,
}: CalendarEntryCardProps): React.JSX.Element {
  const statusStyle = statusStyleByType[entry.status];

  return (
    <Pressable
      accessibilityHint="반복 항목 상세 화면으로 이동해요."
      accessibilityLabel={`${entry.title} 상세 보기`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.entryRow,
        pressed && styles.pressablePressed,
      ]}
    >
      <View style={styles.copy}>
        <AppText style={styles.title} variant="title">
          {entry.title}
        </AppText>
        <View style={styles.metaRow}>
          <AppText style={styles.metaText}>{entry.timeLabel}</AppText>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusStyle.backgroundColor,
                borderColor: statusStyle.borderColor,
              },
            ]}
          >
            <AppText
              style={[styles.statusText, { color: statusStyle.textColor }]}
              variant="label"
            >
              {entry.statusLabel}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.chevron}>
        <ChevronRight color={colors.textMuted} size={18} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chevron: {
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  entryRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressablePressed: {
    opacity: 0.88,
  },
  statusBadge: {
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 11,
    letterSpacing: 0,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
});
