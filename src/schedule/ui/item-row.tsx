import { Pressable, StyleSheet, View } from "react-native";
import { ArrowRight } from "lucide-react-native";

import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing } from "~/ui/tokens";

type Props = {
  accessibilityHint: string;
  accessibilityLabel: string;
  colorHex: string;
  isLast: boolean;
  metaLine: string;
  onPress: () => void;
  title: string;
};

export function ItemRow({
  accessibilityHint,
  accessibilityLabel,
  colorHex,
  isLast,
  metaLine,
  onPress,
  title,
}: Props): React.JSX.Element {
  const themeColors = useThemeColors();

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
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
            style={[styles.colorMarker, { backgroundColor: colorHex }]}
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
