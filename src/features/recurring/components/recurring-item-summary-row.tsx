import { Pressable, StyleSheet, View } from "react-native";
import { ArrowRight } from "lucide-react-native";

import type { RecurringItemColorKey } from "~/entities/schedule";
import { recurringItemColorOptionByKey } from "~/entities/schedule";
import { AppText } from "~/shared/ui/app-text";
import { borderRadius, colors, spacing } from "~/shared/ui/tokens";

type RecurringItemSummaryRowProps = {
  accessibilityHint: string;
  colorKey: RecurringItemColorKey;
  isLast: boolean;
  metaLine: string;
  onPress: () => void;
  title: string;
};

export function RecurringItemSummaryRow({
  accessibilityHint,
  colorKey,
  isLast,
  metaLine,
  onPress,
  title,
}: RecurringItemSummaryRowProps): React.JSX.Element {
  const markerColor = recurringItemColorOptionByKey[colorKey].swatchColor;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={`${title} 상세 보기`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.divider,
        pressed ? styles.pressed : undefined,
      ]}
    >
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.colorMarker, { backgroundColor: markerColor }]}
          />
          <AppText ellipsizeMode="tail" numberOfLines={1} style={styles.title}>
            {title}
          </AppText>
        </View>
        <View style={styles.metaSlot}>
          <AppText
            ellipsizeMode="tail"
            numberOfLines={1}
            style={styles.metaText}
            variant="caption"
          >
            {metaLine}
          </AppText>
        </View>
      </View>

      <View style={styles.actionIcon}>
        <ArrowRight color={colors.text} size={16} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionIcon: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  colorMarker: {
    borderRadius: borderRadius.pill,
    height: 10,
    width: 10,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  divider: {
    borderBottomColor: colors.dividerOnPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metaSlot: {
    marginTop: spacing.xxs,
  },
  metaText: {
    color: colors.textSoft,
  },
  pressed: {
    opacity: 0.72,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    color: colors.text,
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
});
