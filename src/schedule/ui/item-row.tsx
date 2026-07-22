import { Pressable, StyleSheet, View } from "react-native";
import { ArrowRight } from "lucide-react-native";

import type { RecurringItemColorKey } from "~/entities/schedule/model/types";
import { recurringItemColorOptionByKey } from "~/entities/schedule/ui/color-palette";
import { useAppThemeColors } from "~/shared/theme";
import { AppText } from "~/shared/ui/app-text";
import { borderRadius, spacing } from "~/shared/ui/tokens";

type Props = {
  accessibilityHint: string;
  accessibilityLabel?: string;
  colorKey: RecurringItemColorKey;
  isLast: boolean;
  metaLine: string;
  onPress: () => void;
  title: string;
};

export function ItemRow({
  accessibilityHint,
  accessibilityLabel,
  colorKey,
  isLast,
  metaLine,
  onPress,
  title,
}: Props): React.JSX.Element {
  const themeColors = useAppThemeColors();
  const markerColor = recurringItemColorOptionByKey[colorKey].swatchColor;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? `${title} 상세 보기`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && {
          borderBottomColor: themeColors.divider,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
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
          <AppText ellipsizeMode="tail" numberOfLines={1} variant="caption">
            {metaLine}
          </AppText>
        </View>
      </View>

      <View style={[styles.actionIcon, { borderColor: themeColors.primary }]}>
        <ArrowRight color={themeColors.text} size={16} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionIcon: {
    alignItems: "center",
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
  metaSlot: {
    marginTop: spacing.xxs,
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
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
});
