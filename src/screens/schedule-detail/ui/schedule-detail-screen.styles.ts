import { useMemo } from "react";
import { StyleSheet } from "react-native";

import type { AppThemeColors } from "~/shared/theme";
import { useAppThemeColors } from "~/shared/theme";
import { borderRadius, spacing, typography } from "~/shared/ui/tokens";

const MANAGEMENT_MENU_CONTAINER_PADDING = 4;

export function useScheduleDetailScreenStyles() {
  const themeColors = useAppThemeColors();

  return useMemo(
    () => createScheduleDetailScreenStyles(themeColors),
    [themeColors]
  );
}

function createScheduleDetailScreenStyles(themeColors: AppThemeColors) {
  return StyleSheet.create({
    headerLayer: {
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
      zIndex: 10,
    },
    historyDate: {
      color: themeColors.text,
      flex: 1,
    },
    historyEmptyText: {
      color: themeColors.textMuted,
      paddingVertical: spacing.xxs,
    },
    historyRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.md,
      paddingVertical: spacing.xs,
    },
    historyRowDivider: {
      borderTopColor: themeColors.divider,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    historySection: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.xl,
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    historySectionLabel: {
      color: themeColors.text,
    },
    historyStatusChip: {
      alignItems: "center",
      borderRadius: borderRadius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      justifyContent: "center",
      minWidth: 56,
      paddingHorizontal: spacing.xs,
      paddingVertical: 3,
    },
    historyStatusChipCompleted: {
      backgroundColor: themeColors.greenSoft,
      borderColor: themeColors.greenBorder,
    },
    historyStatusChipSkipped: {
      backgroundColor: themeColors.graySoft,
      borderColor: themeColors.grayBorder,
    },
    historyStatusChipText: {
      fontSize: 11,
    },
    historyStatusChipTextCompleted: {
      color: themeColors.greenText,
    },
    historyStatusChipTextSkipped: {
      color: themeColors.grayText,
    },
    managementDeleteText: {
      color: themeColors.error,
    },
    managementMenuButton: {
      alignItems: "center",
      borderRadius: borderRadius.pill,
      height: 48,
      justifyContent: "center",
      width: 48,
    },
    managementMenuButtonDisabled: {
      opacity: 0.4,
    },
    managementMenuButtonPressed: {
      opacity: 0.88,
    },
    managementMenuContent: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.lg,
      padding: MANAGEMENT_MENU_CONTAINER_PADDING,
      width: 80,
    },
    managementMenuOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    managementMenuItem: {
      alignItems: "center",
      borderRadius: borderRadius.md,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 40,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    managementMenuText: {
      color: themeColors.text,
      flex: 1,
      textAlign: "center",
    },
    detailPlaceholder: {
      gap: spacing.xs,
    },
    loadingBadge: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.pill,
      height: 36,
    },
    loadingBadgeGroup: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xxs,
      justifyContent: "center",
      maxWidth: "100%",
    },
    loadingBadgeLong: {
      width: 140,
    },
    loadingBadgeMedium: {
      width: 112,
    },
    loadingBadgeShort: {
      width: 88,
    },
    loadingBadgeStack: {
      alignItems: "center",
      gap: spacing.xxs,
      maxWidth: "100%",
    },
    loadingContent: {
      flex: 1,
    },
    loadingHistoryDate: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.pill,
      flex: 1,
      height: 20,
    },
    loadingHistoryDivider: {
      borderTopColor: themeColors.divider,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    loadingHistoryLabel: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.pill,
      height: typography.lineHeight.caption,
      width: 80,
    },
    loadingHistoryRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.md,
      paddingVertical: spacing.xs,
    },
    loadingHistorySection: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.xl,
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    loadingHistoryStatus: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.pill,
      height: 20,
      width: 52,
    },
    loadingScheduleDate: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.pill,
      height: typography.lineHeight.title,
      width: 96,
    },
    loadingScheduleLabel: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.pill,
      height: typography.lineHeight.caption,
      width: 64,
    },
    loadingScheduleMeta: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.pill,
      height: 20,
      width: 144,
    },
    loadingScheduleSection: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.xl,
      gap: spacing.xxs,
      padding: spacing.md,
    },
    loadingSummarySection: {
      alignItems: "center",
      gap: spacing.md,
      paddingBottom: spacing.md,
      paddingTop: spacing.xs,
    },
    loadingSummaryTitle: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.pill,
      height: typography.lineHeight.title,
      width: "48%",
    },
    screenContent: {
      flex: 1,
    },
    screenRoot: {
      flex: 1,
      position: "relative",
    },
    scrollContent: {
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    scheduleDate: {
      color: themeColors.primaryForeground,
      textAlign: "left",
    },
    scheduleMetaText: {
      color: themeColors.primaryForeground,
      flexShrink: 1,
    },
    scheduleSection: {
      alignItems: "flex-start",
      backgroundColor: themeColors.primary,
      borderRadius: borderRadius.xl,
      gap: spacing.xxs,
      padding: spacing.md,
    },
    scheduleTitle: {
      color: themeColors.primaryForeground,
    },
    summaryBadgeStack: {
      alignItems: "center",
      gap: spacing.xxs,
      maxWidth: "100%",
    },
    summaryColorMarker: {
      borderRadius: borderRadius.pill,
      height: 12,
      width: 12,
    },
    summaryOutlineContent: {
      alignItems: "center",
      flexDirection: "row",
      flexShrink: 1,
      gap: 4,
      minWidth: 0,
    },
    summaryOutlineLabel: {
      color: themeColors.text,
    },
    summaryOutlineGroup: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xxs,
      justifyContent: "center",
      maxWidth: "100%",
    },
    summaryOutlineRow: {
      alignItems: "center",
      borderColor: themeColors.primary,
      borderRadius: borderRadius.pill,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.xxs,
      maxWidth: "100%",
      minHeight: 36,
      paddingHorizontal: spacing.sm,
    },
    summaryOutlineValue: {
      color: themeColors.text,
      flexShrink: 1,
    },
    summaryNotificationIconSlot: {
      alignItems: "center",
      height: typography.lineHeight.body,
      justifyContent: "center",
      width: 14,
    },
    summarySection: {
      alignItems: "center",
      gap: spacing.md,
      paddingBottom: spacing.md,
      paddingTop: spacing.xs,
    },
    summaryTitle: {
      color: themeColors.text,
      textAlign: "center",
    },
  });
}
