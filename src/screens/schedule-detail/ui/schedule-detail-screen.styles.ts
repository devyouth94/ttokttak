import { StyleSheet } from "react-native";

import { borderRadius, colors, spacing, typography } from "~/shared/ui/tokens";

const MANAGEMENT_MENU_CONTAINER_PADDING = 4;

export const scheduleDetailScreenStyles = StyleSheet.create({
  headerLayer: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  historyDate: {
    color: colors.text,
    flex: 1,
  },
  historyEmptyText: {
    color: colors.textMuted,
    paddingVertical: spacing.xxs,
  },
  historyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  historyRowDivider: {
    borderTopColor: colors.dividerOnPrimary,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  historySection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  historySectionLabel: {
    color: colors.text,
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
    backgroundColor: colors.greenSoft,
    borderColor: colors.greenBorder,
  },
  historyStatusChipSkipped: {
    backgroundColor: colors.graySoft,
    borderColor: colors.grayBorder,
  },
  historyStatusChipText: {
    fontSize: 11,
  },
  historyStatusChipTextCompleted: {
    color: colors.greenText,
  },
  historyStatusChipTextSkipped: {
    color: colors.grayText,
  },
  managementDeleteText: {
    color: colors.error,
  },
  managementMenuContent: {
    backgroundColor: colors.surface,
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
    color: colors.text,
    flex: 1,
    textAlign: "center",
  },
  detailPlaceholder: {
    gap: spacing.xs,
  },
  loadingBadge: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    flex: 1,
    height: 20,
  },
  loadingHistoryDivider: {
    borderTopColor: colors.dividerOnPrimary,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  loadingHistoryLabel: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  loadingHistoryStatus: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: 20,
    width: 52,
  },
  loadingScheduleDate: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: typography.lineHeight.title,
    width: 96,
  },
  loadingScheduleLabel: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: typography.lineHeight.caption,
    width: 64,
  },
  loadingScheduleMeta: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: 20,
    width: 144,
  },
  loadingScheduleSection: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
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
    color: colors.primaryForeground,
    textAlign: "left",
  },
  scheduleMetaText: {
    color: colors.primaryForeground,
    flexShrink: 1,
  },
  scheduleSection: {
    alignItems: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    gap: spacing.xxs,
    padding: spacing.md,
  },
  scheduleTitle: {
    color: colors.primaryForeground,
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
    color: colors.text,
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
    borderColor: colors.primary,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xxs,
    maxWidth: "100%",
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  summaryOutlineValue: {
    color: colors.text,
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
    color: colors.text,
    textAlign: "center",
  },
});
