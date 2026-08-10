import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Pencil } from "lucide-react-native";

import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing } from "~/ui/tokens";

type SettingsSectionCardProps = {
  children: ReactNode;
  title: string;
};

type SettingsRowProps = {
  accessory?: ReactNode;
  description?: string;
  isDisabled?: boolean;
  isFirst?: boolean;
  onPress?: () => void;
  tone?: "default" | "danger";
  title: string;
};

type SettingsValueRowProps = {
  isFirst?: boolean;
  isDisabled?: boolean;
  onPress?: () => void;
  title: string;
  value: string;
};

export function SettingsSectionCard({
  children,
  title,
}: SettingsSectionCardProps): React.JSX.Element {
  const themeColors = useThemeColors();

  return (
    <View
      style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}
    >
      <AppText variant="caption">{title}</AppText>
      {children}
    </View>
  );
}

export function SettingsRow({
  accessory,
  description,
  isDisabled = false,
  isFirst = false,
  onPress,
  tone = "default",
  title,
}: SettingsRowProps): React.JSX.Element {
  const themeColors = useThemeColors();

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress || isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isFirst
          ? [styles.rowDivider, { borderTopColor: themeColors.divider }]
          : undefined,
        isDisabled ? styles.rowDisabled : undefined,
        onPress && !isDisabled && pressed ? styles.rowPressed : undefined,
      ]}
    >
      <View style={styles.rowContent}>
        <AppText
          style={tone === "danger" ? { color: themeColors.error } : undefined}
          variant="body3"
        >
          {title}
        </AppText>
        {description && (
          <AppText style={{ color: themeColors.textSoft }} variant="body3">
            {description}
          </AppText>
        )}
      </View>

      {accessory}
    </Pressable>
  );
}

export function SettingsValueRow({
  isDisabled = false,
  isFirst = false,
  onPress,
  title,
  value,
}: SettingsValueRowProps): React.JSX.Element {
  const themeColors = useThemeColors();

  return (
    <SettingsRow
      accessory={
        <View style={styles.valueWithIcon}>
          <AppText
            style={[styles.rowValue, { color: themeColors.textSoft }]}
            variant="body3"
          >
            {value}
          </AppText>
          {onPress && <Pencil color={themeColors.textSoft} size={14} />}
        </View>
      }
      isDisabled={isDisabled}
      isFirst={isFirst}
      onPress={onPress}
      title={title}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowContent: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
  },
  rowDisabled: {
    opacity: 0.56,
  },
  rowPressed: {
    opacity: 0.72,
  },
  rowValue: {
    flexShrink: 1,
    textAlign: "right",
  },
  sectionCard: {
    borderRadius: borderRadius.xl,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  valueWithIcon: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: spacing.xs,
  },
});
