import { Pressable, StyleSheet, View } from "react-native";
import { Check, X } from "lucide-react-native";

import { AppCard } from "~/design-system/components/app-card";
import { AppText } from "~/design-system/components/app-text";
import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "~/design-system/tokens";
import type { CompletionAction } from "~/features/recurring/domain/types";

type HistoryEntryCardProps = {
  action: CompletionAction;
  onPress?: () => void;
  pressableAccessibilityHint?: string;
  pressableAccessibilityLabel?: string;
  statusLabel: string;
  timeLabel: string;
  title: string;
};

function HistoryStatusIcon({
  action,
}: Pick<HistoryEntryCardProps, "action">): React.JSX.Element {
  const isCompleted = action === "completed";

  return (
    <View
      style={[
        styles.statusIcon,
        isCompleted ? styles.statusIconCompleted : styles.statusIconSkipped,
      ]}
    >
      {isCompleted ? (
        <Check color={colors.primaryForeground} size={14} />
      ) : (
        <X color={colors.primaryForeground} size={14} />
      )}
    </View>
  );
}

function HistoryStatusBadge({
  action,
  statusLabel,
}: Pick<HistoryEntryCardProps, "action" | "statusLabel">): React.JSX.Element {
  const isCompleted = action === "completed";
  const badgeStyle = isCompleted
    ? styles.statusBadgeCompleted
    : styles.statusBadgeSkipped;
  const textStyle = isCompleted
    ? styles.statusBadgeTextCompleted
    : styles.statusBadgeTextSkipped;

  return (
    <View style={[styles.statusBadge, badgeStyle]}>
      <AppText style={[styles.statusBadgeText, textStyle]} variant="label">
        {statusLabel}
      </AppText>
    </View>
  );
}

export function HistoryEntryCard({
  action,
  onPress,
  pressableAccessibilityHint,
  pressableAccessibilityLabel,
  statusLabel,
  timeLabel,
  title,
}: HistoryEntryCardProps): React.JSX.Element {
  const body = (
    <View style={styles.cardCopy}>
      <AppText style={styles.cardTitle} variant="title">
        {title}
      </AppText>
      <AppText style={styles.cardMeta}>{timeLabel}</AppText>
    </View>
  );

  return (
    <AppCard>
      <View style={styles.cardRow}>
        <HistoryStatusIcon action={action} />

        {onPress ? (
          <Pressable
            accessibilityHint={pressableAccessibilityHint}
            accessibilityLabel={pressableAccessibilityLabel}
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => [
              styles.cardBodyButton,
              pressed && styles.cardBodyButtonPressed,
            ]}
          >
            {body}
          </Pressable>
        ) : (
          <View style={styles.cardBody}>{body}</View>
        )}

        <HistoryStatusBadge action={action} statusLabel={statusLabel} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  cardBody: {
    flex: 1,
  },
  cardBodyButton: {
    borderRadius: borderRadius.md,
    flex: 1,
  },
  cardBodyButtonPressed: {
    opacity: 0.88,
  },
  cardCopy: {
    gap: spacing.xs,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: typography.label,
    lineHeight: 18,
  },
  cardRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 24,
  },
  statusBadge: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 72,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusBadgeCompleted: {
    backgroundColor: colors.statusCompletedSoft,
    borderColor: "#D3E8D6",
  },
  statusBadgeSkipped: {
    backgroundColor: colors.statusSkippedSoft,
    borderColor: "#F6D8BC",
  },
  statusBadgeText: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  statusBadgeTextCompleted: {
    color: colors.statusCompletedText,
  },
  statusBadgeTextSkipped: {
    color: colors.statusSkippedText,
  },
  statusIcon: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  statusIconCompleted: {
    backgroundColor: colors.statusCompleted,
  },
  statusIconSkipped: {
    backgroundColor: colors.statusSkipped,
  },
});
