import { StyleSheet } from "react-native";

import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "~/design-system/tokens";

export const styles = StyleSheet.create({
  advancedContent: {
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceLow,
    padding: spacing.md,
  },
  advancedHelperText: {
    color: colors.textMuted,
    fontSize: typography.label,
    lineHeight: 18,
    textAlign: "left",
  },
  advancedToggle: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  anchorCard: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  anchorDescription: {
    color: colors.textMuted,
    fontSize: typography.label,
    lineHeight: 18,
    textAlign: "left",
  },
  anchorOption: {
    flex: 1,
    alignItems: "center",
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceLow,
    gap: 2,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  anchorOptionDisabled: {
    opacity: 0.45,
  },
  anchorOptionPressed: {
    opacity: 0.88,
  },
  anchorOptionSelected: {
    backgroundColor: colors.primary,
  },
  anchorOptionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "600",
  },
  anchorOptionTitleSelected: {
    color: colors.primaryForeground,
    fontSize: typography.body,
    fontWeight: "600",
  },
  chip: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceLow,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 72,
    paddingHorizontal: spacing.md,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipSelected: {
    backgroundColor: "#333333",
  },
  chipText: {
    color: "#666666",
    fontSize: typography.body,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: colors.primaryForeground,
    fontSize: typography.body,
    fontWeight: "600",
  },
  compactInput: {
    minHeight: 52,
  },
  customRecurrenceComposer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  customRecurrenceCountField: {
    flex: 0.88,
    gap: spacing.xs,
  },
  customRecurrenceFieldLabel: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: "700",
    textAlign: "left",
  },
  customRecurrenceInput: {
    minHeight: 44,
  },
  customRecurrencePanel: {
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceLow,
    padding: spacing.md,
  },
  customRecurrenceSectionLabel: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "700",
    textAlign: "left",
  },
  customRecurrenceSentence: {
    borderRadius: borderRadius.md,
    backgroundColor: "rgba(255,255,255,0.56)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  customRecurrenceSentenceText: {
    color: colors.textMuted,
    fontSize: typography.label,
    lineHeight: 18,
  },
  customRecurrenceUnitChip: {
    minHeight: 44,
    minWidth: 48,
  },
  customRecurrenceUnitField: {
    flex: 1.12,
    gap: spacing.xs,
  },
  customRecurrenceUnitOption: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  customRecurrenceUnits: {
    flexDirection: "row",
    gap: 4,
  },
  customRecurrenceWeekdayLabel: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: "700",
  },
  customRecurrenceWeekdaySection: {
    gap: spacing.sm,
    borderTopColor: "rgba(0, 0, 0, 0.08)",
    borderTopWidth: 1,
    marginTop: spacing.xs,
    paddingTop: spacing.md,
  },
  dateField: {
    flex: 1.18,
  },
  errorCard: {
    gap: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.errorContainer,
    padding: spacing.md,
  },
  errorText: {
    color: colors.error,
    lineHeight: 20,
  },
  errorTitle: {
    color: colors.error,
  },
  field: {
    gap: spacing.xs,
  },
  fieldError: {
    color: colors.error,
    fontSize: typography.label,
    lineHeight: 18,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: "700",
  },
  footer: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  iconInputShell: {
    alignItems: "center",
    backgroundColor: colors.surfaceLow,
    borderColor: "#ececec",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  iconInputValue: {
    color: colors.text,
    flex: 1,
    flexShrink: 1,
    fontSize: typography.body,
  },
  inlineAction: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  inlineActionPressed: {
    opacity: 0.72,
  },
  inlineActionText: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: "600",
  },
  inputError: {
    borderColor: colors.error,
  },
  intervalInput: {
    minWidth: 0,
    textAlign: "center",
    backgroundColor: colors.background,
    borderColor: "#ececec",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    color: colors.text,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.body,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  notificationCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceLow,
    borderRadius: borderRadius.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 72,
    paddingHorizontal: spacing.md,
  },
  notificationCopy: {
    flex: 1,
    gap: 2,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
  },
  notificationIconWrap: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: borderRadius.pill,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  notificationSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  notificationSwitchWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  notificationTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700",
  },
  pickerModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.28)",
  },
  pickerModalCancelText: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: "600",
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
    fontSize: typography.body,
    fontWeight: "700",
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
    fontSize: typography.body,
    fontWeight: "700",
  },
  primaryRecurrenceChip: {
    flex: 1,
  },
  primaryTextInput: {
    minHeight: 56,
  },
  quickRecurrenceGrid: {
    flexDirection: "row",
    gap: 4,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#333333",
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  saveButtonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonText: {
    color: colors.primaryForeground,
    fontSize: typography.body,
    fontWeight: "700",
  },
  scrollContent: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  secondaryRecurrenceRow: {
    flexDirection: "row",
    gap: 4,
  },
  subFieldLabel: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "700",
  },
  textInput: {
    backgroundColor: colors.surfaceLow,
    borderColor: "#ececec",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    color: colors.text,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.body,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  timeField: {
    flex: 0.82,
  },
  unitChip: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    backgroundColor: colors.background,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 56,
    paddingHorizontal: spacing.md,
  },
  weekdayChip: {
    aspectRatio: 1,
    alignItems: "center",
    backgroundColor: colors.surfaceLow,
    borderRadius: borderRadius.pill,
    flex: 1,
    justifyContent: "center",
  },
  weekdayChipInsideCustomPanel: {
    backgroundColor: colors.background,
  },
  weekdayChipPressed: {
    opacity: 0.88,
  },
  weekdayChipSelected: {
    backgroundColor: "#333333",
  },
  weekdayChipText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "600",
  },
  weekdayChipTextSelected: {
    color: colors.primaryForeground,
    fontSize: typography.body,
    fontWeight: "600",
  },
  weekdayGroup: {
    flexDirection: "row",
    gap: 4,
  },
});
