import { Platform, StyleSheet } from "react-native";

import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "~/design-system/tokens";

export const styles = StyleSheet.create({
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
    color: colors.textSoft,
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
    backgroundColor: colors.surface,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 72,
    paddingHorizontal: spacing.md,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: colors.primaryForeground,
  },
  compactInput: {
    minHeight: 48,
  },
  colorSwatch: {
    borderRadius: borderRadius.pill,
    height: 12,
    width: 12,
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
    borderColor: colors.accent,
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
    backgroundColor: colors.errorContainer,
    padding: spacing.md,
  },
  errorText: {
    color: colors.error,
  },
  errorTitle: {
    color: colors.error,
  },
  field: {
    gap: spacing.xs,
  },
  fieldError: {
    color: colors.error,
  },
  fieldHelper: {
    color: colors.textMuted,
  },
  fieldLabel: {
    color: colors.text,
  },
  headerLayer: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  footer: {
    backgroundColor: colors.background,
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
    borderColor: colors.dividerOnPrimary,
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
    color: colors.text,
    flex: 1,
    flexShrink: 1,
  },
  inlineActionPressed: {
    opacity: 0.72,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputFocused: {
    borderColor: colors.primary,
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
    color: colors.textMuted,
  },
  multilineInput: {
    minHeight: 108,
    paddingTop: spacing.md,
  },
  pickerModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.scrim,
  },
  pickerModalCancelText: {
    color: colors.textMuted,
  },
  pickerModalCard: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    backgroundColor: colors.background,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  pickerModalConfirmText: {
    color: colors.primary,
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
    color: colors.text,
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
    borderColor: colors.primary,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    height: 36,
    minHeight: 36,
    minWidth: 52,
    paddingHorizontal: spacing.sm,
  },
  quickRecurrenceChipSelected: {
    backgroundColor: colors.primary,
  },
  quickRecurrenceChipText: {
    color: colors.text,
  },
  quickRecurrenceChipTextSelected: {
    color: colors.primaryForeground,
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    flexDirection: "row",
    height: 36,
    overflow: "hidden",
  },
  recurrenceModeTabSelected: {
    backgroundColor: colors.primary,
  },
  recurrenceModeTabText: {
    color: colors.textSoft,
  },
  recurrenceModeTabTextSelected: {
    color: colors.primaryForeground,
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
    backgroundColor: colors.background,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
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
    color: colors.primaryForeground,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  screenRoot: {
    flex: 1,
    position: "relative",
  },
  subFieldLabel: {
    color: colors.text,
  },
  textInput: {
    backgroundColor: "transparent",
    borderColor: colors.dividerOnPrimary,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    color: colors.text,
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
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    flex: 1,
    justifyContent: "center",
  },
  weekdayChipPressed: {
    opacity: 0.88,
  },
  weekdayChipSelected: {
    backgroundColor: colors.primary,
  },
  weekdayChipText: {
    color: colors.text,
  },
  weekdayChipTextSelected: {
    color: colors.primaryForeground,
  },
  weekdayGroup: {
    flexDirection: "row",
    gap: 4,
  },
});
