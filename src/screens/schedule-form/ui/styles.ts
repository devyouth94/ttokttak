import { useMemo } from "react";
import { Platform, StyleSheet } from "react-native";

import type { ThemeColors } from "~/theme/colors";
import { useThemeColors } from "~/theme/provider";
import { borderRadius, spacing, typography } from "~/ui/tokens";

export function useScheduleFormScreenStyles() {
  const themeColors = useThemeColors();

  return useMemo(
    () => createScheduleFormScreenStyles(themeColors),
    [themeColors]
  );
}

export type ScheduleFormScreenStyles = ReturnType<
  typeof createScheduleFormScreenStyles
>;

function createScheduleFormScreenStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
    optionInfoButton: {
      alignItems: "center",
      justifyContent: "center",
    },
    optionRows: {
      gap: spacing.none,
    },
    optionToggleGroup: {
      gap: spacing.xs,
    },
    optionToggleLabel: {
      color: themeColors.textSoft,
      includeFontPadding: false,
      textAlignVertical: "center",
    },
    optionToggleLabelGroup: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xxs,
    },
    optionToggleRow: {
      alignItems: "center",
      flexDirection: "row",
      height: 40,
      justifyContent: "space-between",
    },
    optionToggleSwitch: {
      transform: Platform.select({
        ios: [{ translateY: 8 }],
        default: undefined,
      }),
    },
    chip: {
      alignItems: "center",
      borderRadius: borderRadius.pill,
      backgroundColor: themeColors.surface,
      justifyContent: "center",
      minHeight: 42,
      minWidth: 72,
      paddingHorizontal: spacing.md,
    },
    chipPressed: {
      opacity: 0.88,
    },
    compactInput: {
      minHeight: 48,
    },
    createSaveButton: {
      width: "100%",
    },
    customRecurrenceControlGroup: {
      gap: spacing.xs,
    },
    customRecurrenceControls: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    customRecurrenceInput: {
      flex: 1,
      height: 36,
      minHeight: 36,
      minWidth: 0,
      paddingVertical: spacing.xxs,
      textAlign: "center",
    },
    customRecurrenceUnitOption: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: spacing.sm,
    },
    dateField: {
      flex: 1.1,
    },
    deleteButton: {
      alignItems: "center",
      backgroundColor: "transparent",
      borderColor: themeColors.accent,
      borderRadius: borderRadius.pill,
      borderWidth: 1,
      height: 48,
      justifyContent: "center",
      width: 56,
    },
    deleteButtonPressed: {
      opacity: 0.9,
    },
    editSaveButton: {
      flex: 1,
    },
    endDateControl: {
      gap: spacing.xs,
    },
    endDateField: {
      width: "100%",
    },
    errorCard: {
      gap: spacing.xs,
      borderRadius: borderRadius.lg,
      backgroundColor: themeColors.errorContainer,
      padding: spacing.md,
    },
    errorText: {
      color: themeColors.error,
    },
    errorTitle: {
      color: themeColors.error,
    },
    field: {
      gap: spacing.xs,
    },
    fieldError: {
      color: themeColors.error,
    },
    fieldHelper: {
      color: themeColors.textMuted,
    },
    fieldLabel: {
      color: themeColors.text,
    },
    footer: {
      backgroundColor: themeColors.background,
      minHeight: 60,
      paddingHorizontal: spacing.md,
      paddingTop: 8,
      paddingBottom: 8,
    },
    footerActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs,
    },
    iconInputShell: {
      alignItems: "center",
      backgroundColor: "transparent",
      borderColor: themeColors.border,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.xxs,
      paddingHorizontal: spacing.md,
    },
    iconInputShellDisabled: {
      opacity: 0.58,
    },
    iconInputValue: {
      color: themeColors.text,
      flex: 1,
      flexShrink: 1,
    },
    inlineActionPressed: {
      opacity: 0.72,
    },
    inputError: {
      borderColor: themeColors.error,
    },
    inputFocused: {
      borderColor: themeColors.primary,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    loadingContainer: {
      alignItems: "center",
      flex: 1,
      gap: spacing.md,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
    },
    loadingText: {
      color: themeColors.textMuted,
    },
    multilineInput: {
      minHeight: 108,
      paddingTop: spacing.md,
    },
    pickerModalBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: themeColors.scrim,
    },
    pickerModalCancelText: {
      color: themeColors.textMuted,
    },
    pickerModalCard: {
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      backgroundColor: themeColors.background,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
    },
    pickerModalConfirmText: {
      color: themeColors.primary,
      textAlign: "right",
    },
    pickerModalHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    pickerModalTextButton: {
      minWidth: 44,
      paddingVertical: spacing.xs,
    },
    pickerModalTitle: {
      color: themeColors.text,
    },
    primaryRecurrenceChip: {
      flex: 1,
    },
    primaryTextInput: {
      minHeight: 48,
    },
    pickerFieldPressed: {
      opacity: 0.8,
    },
    quickRecurrenceChip: {
      backgroundColor: "transparent",
      borderColor: themeColors.primary,
      borderRadius: borderRadius.pill,
      borderWidth: 1,
      height: 36,
      minHeight: 36,
      minWidth: 52,
      paddingHorizontal: spacing.sm,
    },
    quickRecurrenceChipSelected: {
      backgroundColor: themeColors.primary,
    },
    quickRecurrenceChipText: {
      color: themeColors.text,
    },
    quickRecurrenceChipTextSelected: {
      color: themeColors.primaryForeground,
    },
    quickRecurrenceContent: {
      gap: spacing.xs,
    },
    quickRecurrenceGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
    },
    recurrenceSettingsStack: {
      gap: spacing.xs,
    },
    recurrenceModeTab: {
      alignItems: "center",
      borderRadius: borderRadius.pill,
      flex: 1,
      height: "100%",
      justifyContent: "center",
    },
    recurrenceModeTabPressed: {
      opacity: 0.88,
    },
    recurrenceModeTabs: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.pill,
      flexDirection: "row",
      height: 36,
      overflow: "hidden",
    },
    recurrenceModeTabSelected: {
      backgroundColor: themeColors.primary,
    },
    recurrenceModeTabText: {
      color: themeColors.textSoft,
    },
    recurrenceModeTabTextSelected: {
      color: themeColors.primaryForeground,
    },
    row: {
      flexDirection: "row",
      gap: spacing.xs,
    },
    scheduleSettingsGroup: {
      gap: spacing.xs,
    },
    safeArea: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    saveButton: {
      alignItems: "center",
      backgroundColor: themeColors.primary,
      borderRadius: borderRadius.pill,
      height: 48,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonPressed: {
      opacity: 0.9,
    },
    saveButtonText: {
      color: themeColors.primaryForeground,
    },
    scrollContent: {
      gap: spacing.lg,
      paddingBottom: spacing.xxl,
      paddingHorizontal: spacing.md,
    },
    scrollView: {
      flex: 1,
    },
    screenRoot: {
      flex: 1,
    },
    subFieldLabel: {
      color: themeColors.text,
    },
    textInput: {
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
    timeField: {
      flex: 0.9,
    },
    weekdayChip: {
      aspectRatio: 1,
      alignItems: "center",
      backgroundColor: "transparent",
      borderColor: themeColors.primary,
      borderWidth: 1,
      borderRadius: borderRadius.pill,
      flex: 1,
      justifyContent: "center",
    },
    weekdayChipPressed: {
      opacity: 0.88,
    },
    weekdayChipSelected: {
      backgroundColor: themeColors.primary,
    },
    weekdayChipText: {
      color: themeColors.text,
    },
    weekdayChipTextSelected: {
      color: themeColors.primaryForeground,
    },
    weekdayGroup: {
      flexDirection: "row",
      gap: 4,
    },
  });
}
