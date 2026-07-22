import { useMemo } from "react";
import { StyleSheet } from "react-native";

import type { AppThemeColors } from "~/shared/theme";
import { useAppThemeColors } from "~/shared/theme";
import { borderRadius, spacing, typography } from "~/shared/ui/tokens";

export function useSettingsScreenStyles() {
  const themeColors = useAppThemeColors();

  return useMemo(() => createSettingsScreenStyles(themeColors), [themeColors]);
}

export type SettingsScreenStyles = ReturnType<
  typeof createSettingsScreenStyles
>;

function createSettingsScreenStyles(themeColors: AppThemeColors) {
  return StyleSheet.create({
    dangerText: {
      color: themeColors.error,
    },
    modalBackdrop: {
      alignItems: "center",
      backgroundColor: themeColors.scrim,
      flex: 1,
      justifyContent: "center",
      padding: spacing.lg,
    },
    nameEditor: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.xl,
      gap: spacing.md,
      padding: spacing.lg,
      width: "100%",
    },
    nameEditorActions: {
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "flex-end",
    },
    nameEditorButton: {
      alignItems: "center",
      borderRadius: borderRadius.pill,
      height: 36,
      justifyContent: "center",
      minWidth: 72,
      paddingHorizontal: spacing.md,
    },
    nameEditorCancelButton: {
      borderColor: themeColors.border,
      borderWidth: StyleSheet.hairlineWidth,
    },
    nameEditorCancelText: {
      color: themeColors.textMuted,
    },
    nameEditorSaveButton: {
      backgroundColor: themeColors.primary,
    },
    nameEditorSaveText: {
      color: themeColors.primaryForeground,
    },
    nameEditorTitle: {
      color: themeColors.text,
    },
    nameErrorText: {
      color: themeColors.error,
    },
    nameInput: {
      backgroundColor: "transparent",
      borderColor: themeColors.border,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      color: themeColors.text,
      fontFamily: typography.fontFamily.body,
      fontSize: typography.size.body3,
      lineHeight: typography.lineHeight.body3,
      minHeight: 48,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.md,
      justifyContent: "space-between",
      paddingVertical: spacing.xs,
    },
    rowAccessory: {
      alignItems: "center",
      justifyContent: "center",
    },
    rowDivider: {
      borderTopColor: themeColors.divider,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    rowContent: {
      flex: 1,
      gap: spacing.xxs,
      minWidth: 0,
    },
    rowDescription: {
      color: themeColors.textSoft,
    },
    rowDisabled: {
      opacity: 0.56,
    },
    rowPressed: {
      opacity: 0.72,
    },
    rowTitle: {
      color: themeColors.text,
    },
    rowValue: {
      color: themeColors.textSoft,
      flexShrink: 1,
      textAlign: "right",
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.md,
    },
    sectionCard: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.xl,
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    sections: {
      gap: spacing.lg,
    },
    sectionTitle: {
      color: themeColors.text,
    },
    selectAccessory: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs,
    },
    valueWithIcon: {
      alignItems: "center",
      flexDirection: "row",
      flexShrink: 1,
      gap: spacing.xs,
    },
  });
}
