import { type ReactNode, useState } from "react";
import { Alert, Animated, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as DropdownMenu from "@rn-primitives/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, EllipsisVertical } from "lucide-react-native";

import { AppScreen } from "~/design-system/components/app-screen";
import { AppStateView } from "~/design-system/components/app-state";
import { AppText } from "~/design-system/components/app-text";
import { FocusScreenHeader } from "~/design-system/components/focus-screen-header";
import { IconButton } from "~/design-system/components/icon-button";
import { useCollapsibleHeader } from "~/design-system/hooks/use-collapsible-header";
import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "~/design-system/tokens";
import { useNotificationBootstrap } from "~/features/notifications/notification-bootstrap";
import {
  buildOccurrenceStatusCard,
  buildRecurringItemDetailViewModel,
  getItemDetailBasisOccurrence,
  getRecurringItemDetailDeleteReturnPath,
  type ItemDetailHistoryEntry,
  type ItemDetailSummaryBadge,
} from "~/features/recurring/components/recurring-item-detail-screen.helpers";
import { recurringItemColorOptionByKey } from "~/features/recurring/domain/color-palette";
import { completeRecurringItemMutationFlow } from "~/features/recurring/domain/recurring-item-mutation-flow";
import type { RecurringItemColorKey } from "~/features/recurring/domain/types";
import { recurringQueryKeys } from "~/features/recurring/hooks/recurring-query-keys";
import { useCompletionLogsForItemQuery } from "~/features/recurring/hooks/use-completion-logs-query";
import { useRecurringFeedContext } from "~/features/recurring/hooks/use-recurring-feed-context";
import { useRecurringItemByIdQuery } from "~/features/recurring/hooks/use-recurring-items-query";
import { archiveRecurringItem } from "~/features/recurring/repositories/recurring-items-repository";
import { getErrorMessage } from "~/lib/errors/get-error-message";

const DETAIL_PLACEHOLDER_HISTORY_ROW_COUNT = 3;
const ITEM_NOT_FOUND_MESSAGE = "반복 항목을 찾을 수 없습니다.";
const MANAGEMENT_MENU_CONTAINER_PADDING = 4;

function DetailScheduleSection({
  dateLabel,
  metaLabel,
  timeLabel,
  title,
}: {
  dateLabel: string;
  metaLabel: string;
  timeLabel: string | null;
  title: string;
}): React.JSX.Element {
  return (
    <View style={styles.scheduleSection}>
      <AppText style={styles.scheduleTitle} variant="caption">
        {title}
      </AppText>
      <AppText style={styles.scheduleDate} variant="title">
        {dateLabel}
      </AppText>
      <AppText style={styles.scheduleMetaText} variant="body3">
        {[metaLabel, timeLabel].filter(Boolean).join(" ")}
      </AppText>
    </View>
  );
}

function DetailSummarySection({
  colorKey,
  notificationLabel,
  notificationsEnabled,
  recurrenceLabel,
  settingBadges,
  title,
}: {
  colorKey: RecurringItemColorKey;
  notificationLabel: string;
  notificationsEnabled: boolean;
  recurrenceLabel: string;
  settingBadges: ItemDetailSummaryBadge[];
  title: string;
}): React.JSX.Element {
  const NotificationIcon = notificationsEnabled ? Bell : BellOff;
  const colorOption = recurringItemColorOptionByKey[colorKey];
  const notificationStatusLabel = notificationsEnabled ? "사용" : "중지";
  const anchorBadges = settingBadges.filter(
    (badge) => badge.id !== "start-date"
  );
  const startBadge = settingBadges.find((badge) => badge.id === "start-date");

  return (
    <View style={styles.summarySection}>
      <AppText style={styles.summaryTitle} variant="title">
        {title}
      </AppText>

      <View style={styles.summaryBadgeStack}>
        <View style={styles.summaryOutlineGroup}>
          <DetailSummaryOutlineRow label="반복" value={recurrenceLabel} />

          <DetailSummaryOutlineRow
            accessibilityLabel={`알림 ${notificationLabel} ${notificationStatusLabel}`}
            label="알림"
            trailingIcon={
              <View style={styles.summaryNotificationIconSlot}>
                <NotificationIcon
                  absoluteStrokeWidth
                  color={colors.text}
                  size={14}
                  strokeWidth={1.2}
                />
              </View>
            }
            value={notificationLabel}
          />
        </View>

        <View style={styles.summaryOutlineGroup}>
          {startBadge ? (
            <DetailSummaryOutlineRow
              label={startBadge.label}
              value={startBadge.value}
            />
          ) : null}
          <DetailSummaryColorRow
            colorLabel={colorOption.label}
            swatchColor={colorOption.swatchColor}
          />
        </View>

        {anchorBadges.length > 0 ? (
          <View style={styles.summaryOutlineGroup}>
            {anchorBadges.map((badge) => (
              <DetailSummaryOutlineRow
                key={badge.id}
                label={badge.label}
                value={badge.value}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DetailSummaryColorRow({
  colorLabel,
  swatchColor,
}: {
  colorLabel: string;
  swatchColor: string;
}): React.JSX.Element {
  return (
    <View
      accessibilityLabel={`색상 ${colorLabel}`}
      accessible
      style={styles.summaryOutlineRow}
    >
      <AppText style={styles.summaryOutlineLabel} variant="caption">
        색상
      </AppText>
      <View style={styles.summaryOutlineContent}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.summaryColorMarker, { backgroundColor: swatchColor }]}
        />
      </View>
    </View>
  );
}

function DetailSummaryOutlineRow({
  accessibilityLabel,
  label,
  trailingIcon,
  value,
}: {
  accessibilityLabel?: string;
  label: string;
  trailingIcon?: ReactNode;
  value: string;
}): React.JSX.Element {
  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={styles.summaryOutlineRow}
    >
      <AppText style={styles.summaryOutlineLabel} variant="caption">
        {label}
      </AppText>
      <View style={styles.summaryOutlineContent}>
        <AppText
          ellipsizeMode="tail"
          numberOfLines={1}
          style={styles.summaryOutlineValue}
          variant="body3"
        >
          {value}
        </AppText>
        {trailingIcon}
      </View>
    </View>
  );
}

function DetailLoadingPlaceholder(): React.JSX.Element {
  return (
    <View
      accessibilityLabel="일정 상세를 불러오는 중"
      accessibilityRole="progressbar"
      style={styles.detailPlaceholder}
    >
      <View style={styles.loadingSummarySection}>
        <View style={styles.loadingSummaryTitle} />

        <View style={styles.loadingBadgeStack}>
          <View style={styles.loadingBadgeGroup}>
            <View style={[styles.loadingBadge, styles.loadingBadgeMedium]} />
            <View style={[styles.loadingBadge, styles.loadingBadgeLong]} />
          </View>

          <View style={styles.loadingBadgeGroup}>
            <View style={[styles.loadingBadge, styles.loadingBadgeLong]} />
            <View style={[styles.loadingBadge, styles.loadingBadgeShort]} />
          </View>
        </View>
      </View>

      <View style={styles.loadingScheduleSection}>
        <View style={styles.loadingScheduleLabel} />
        <View style={styles.loadingScheduleDate} />
        <View style={styles.loadingScheduleMeta} />
      </View>

      <View style={styles.loadingHistorySection}>
        <View style={styles.loadingHistoryLabel} />
        {Array.from({ length: DETAIL_PLACEHOLDER_HISTORY_ROW_COUNT }).map(
          (_, index) => (
            <View
              key={index}
              style={[
                styles.loadingHistoryRow,
                index > 0 ? styles.loadingHistoryDivider : undefined,
              ]}
            >
              <View style={styles.loadingHistoryDate} />
              <View style={styles.loadingHistoryStatus} />
            </View>
          )
        )}
      </View>
    </View>
  );
}

function DetailErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.statePanel}>
      <AppStateView
        action={{
          accessibilityHint: "상세 화면 데이터를 다시 불러와요.",
          accessibilityLabel: "상세 화면 다시 시도",
          label: "다시 시도",
          onPress: onRetry,
        }}
        description={message}
        style={styles.errorState}
        title="일정을 불러오지 못했어요"
      />
    </View>
  );
}

function DetailInlineErrorCard({
  message,
  title = "처리를 완료하지 못했어요",
}: {
  message: string;
  title?: string;
}): React.JSX.Element {
  return (
    <View style={styles.statePanel}>
      <AppStateView
        description={message}
        style={styles.inlineErrorState}
        title={title}
      />
    </View>
  );
}

function DetailHistorySection({
  entries,
}: {
  entries: ItemDetailHistoryEntry[];
}): React.JSX.Element {
  return (
    <View style={styles.historySection}>
      <AppText style={styles.historySectionLabel} variant="caption">
        최근 히스토리
      </AppText>

      <View>
        {entries.length > 0 ? (
          entries.map((entry, index) => (
            <DetailHistoryCard
              entry={entry}
              isFirst={index === 0}
              key={entry.id}
            />
          ))
        ) : (
          <AppText style={styles.historyEmptyText} variant="body3">
            아직 완료 기록이 없어요
          </AppText>
        )}
      </View>
    </View>
  );
}

function DetailHistoryCard({
  entry,
  isFirst,
}: {
  entry: ItemDetailHistoryEntry;
  isFirst: boolean;
}): React.JSX.Element {
  const isCompleted = entry.action === "completed";
  const statusChipStyle = isCompleted
    ? styles.historyStatusChipCompleted
    : styles.historyStatusChipSkipped;
  const statusChipTextStyle = isCompleted
    ? styles.historyStatusChipTextCompleted
    : styles.historyStatusChipTextSkipped;

  return (
    <View style={[styles.historyRow, !isFirst && styles.historyRowDivider]}>
      <AppText style={styles.historyDate} variant="body3">
        {entry.timeLabel}
      </AppText>
      <View style={[styles.historyStatusChip, statusChipStyle]}>
        <AppText
          style={[styles.historyStatusChipText, statusChipTextStyle]}
          variant="label"
        >
          {entry.statusLabel}
        </AppText>
      </View>
    </View>
  );
}

function DetailNotFoundCard(): React.JSX.Element {
  return (
    <View style={styles.statePanel}>
      <AppStateView
        action={{
          accessibilityHint: "홈 화면으로 이동해요.",
          accessibilityLabel: "홈으로 이동",
          label: "홈으로 이동",
          onPress: () => {
            router.replace("/");
          },
        }}
        description="이미 삭제되었거나 접근할 수 없는 일정이에요."
        style={styles.emptyCard}
        title="일정을 찾을 수 없어요"
      />
    </View>
  );
}

export function RecurringItemDetailScreen({
  itemId,
  returnTo,
  scheduledAtUtc,
}: {
  itemId?: string;
  returnTo?: string;
  scheduledAtUtc?: string;
}): React.JSX.Element {
  const { isReady, timezone, userId } = useRecurringFeedContext();
  const { syncAfterMutation } = useNotificationBootstrap();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const {
    headerAnimatedStyle,
    headerHeight,
    onHeaderHeightChange,
    onScroll,
    scrollEventThrottle,
  } = useCollapsibleHeader({ hiddenOffset: insets.top });
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(
    null
  );
  const [isArchiving, setIsArchiving] = useState(false);

  const itemQuery = useRecurringItemByIdQuery({
    enabled: isReady,
    itemId: itemId ?? null,
    timezone,
    userId,
  });
  const completionLogsQuery = useCompletionLogsForItemQuery({
    enabled: isReady,
    itemId: itemId ?? null,
    userId,
  });
  const isLoading =
    !isReady ||
    !userId ||
    itemQuery.isPending ||
    (Boolean(itemQuery.data) && completionLogsQuery.isPending);
  const queryErrorMessage = !itemId
    ? "일정 경로를 확인할 수 없어요."
    : itemQuery.error
      ? getErrorMessage(itemQuery.error)
      : completionLogsQuery.error
        ? getErrorMessage(completionLogsQuery.error)
        : null;

  const item = itemQuery.data;
  const completionLogs = completionLogsQuery.data ?? [];
  const now = new Date();
  const viewModel = item
    ? buildRecurringItemDetailViewModel({
        completionLogs,
        item,
        now,
        timezone,
      })
    : null;
  const basisOccurrence =
    item && viewModel
      ? getItemDetailBasisOccurrence({
          completionLogs,
          item,
          now,
          primaryOccurrence: viewModel.primaryOccurrence,
          scheduledAtUtc,
          timezone,
        })
      : null;
  const statusCard =
    basisOccurrence && scheduledAtUtc
      ? buildOccurrenceStatusCard({
          now,
          occurrence: basisOccurrence,
          timezone,
        })
      : viewModel?.statusCard;
  const isMutating = isArchiving;
  const isContentUnrecoverable =
    item?.contentStatus?.status === "unrecoverable";
  const isNotFound =
    !item &&
    !isLoading &&
    (queryErrorMessage === ITEM_NOT_FOUND_MESSAGE ||
      queryErrorMessage === null);
  const scrollBottomPadding = spacing.lg;
  const scrollTopPadding = headerHeight;

  const refetchDetail = async (): Promise<void> => {
    await Promise.all([itemQuery.refetch(), completionLogsQuery.refetch()]);
  };

  const handleRetry = (): void => {
    setActionErrorMessage(null);
    void refetchDetail();
  };

  const handleEdit = (): void => {
    if (!itemId || isMutating) {
      return;
    }

    router.push({
      params: {
        itemId,
        ...(returnTo ? { returnTo } : {}),
      },
      pathname: "/items/[itemId]/edit",
    });
  };

  const invalidateRecurringUserQueries = async (
    currentUserId: string
  ): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: recurringQueryKeys.user(currentUserId),
    });
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!item || !userId || isMutating) {
      return;
    }

    setActionErrorMessage(null);
    setIsArchiving(true);

    try {
      const effectiveFromUtc = new Date().toISOString();

      await archiveRecurringItem({
        id: item.id,
        userId,
      });
      await completeRecurringItemMutationFlow({
        effectiveFromUtc,
        invalidateRecurringUserQueries,
        itemId: item.id,
        reason: "item-archived",
        syncAfterMutation,
        userId,
      });

      router.replace(getRecurringItemDetailDeleteReturnPath(returnTo));
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error));
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = (): void => {
    if (!item || !userId || isMutating) {
      return;
    }

    Alert.alert("일정 삭제", "이 일정을 삭제할까요?", [
      {
        style: "cancel",
        text: "취소",
      },
      {
        style: "destructive",
        text: "삭제",
        onPress: () => {
          void handleDeleteConfirm();
        },
      },
    ]);
  };

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <View style={styles.screenRoot}>
        <Animated.View style={[styles.headerLayer, headerAnimatedStyle]}>
          <FocusScreenHeader
            onBack={() => {
              router.back();
            }}
            onHeightChange={onHeaderHeightChange}
            rightSlot={
              item && !queryErrorMessage ? (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <IconButton
                      accessibilityHint="일정 관리 메뉴를 열어요."
                      accessibilityLabel="일정 관리"
                      disabled={isMutating}
                      icon={<EllipsisVertical color={colors.text} size={20} />}
                      size="lg"
                    />
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Overlay
                      closeOnPress
                      style={styles.managementMenuOverlay}
                    />
                    <DropdownMenu.Content
                      align="end"
                      avoidCollisions
                      insets={{
                        bottom: spacing.lg,
                        left: spacing.md,
                        right: spacing.md,
                        top: spacing.lg,
                      }}
                      side="bottom"
                      sideOffset={2}
                      style={styles.managementMenuContent}
                    >
                      {isContentUnrecoverable ? null : (
                        <DropdownMenu.Item
                          accessibilityHint="현재 일정 수정 화면으로 이동해요."
                          closeOnPress
                          style={styles.managementMenuItem}
                          onPress={handleEdit}
                        >
                          <AppText
                            numberOfLines={1}
                            style={styles.managementMenuText}
                            variant="label"
                          >
                            수정
                          </AppText>
                        </DropdownMenu.Item>
                      )}

                      <DropdownMenu.Item
                        accessibilityHint="현재 일정을 삭제해요."
                        closeOnPress
                        style={styles.managementMenuItem}
                        onPress={handleDelete}
                      >
                        <AppText
                          numberOfLines={1}
                          style={[
                            styles.managementMenuText,
                            styles.managementDeleteText,
                          ]}
                          variant="label"
                        >
                          삭제
                        </AppText>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              ) : undefined
            }
            title="일정 상세"
          />
        </Animated.View>

        {isLoading ? (
          <View
            style={[
              styles.loadingContent,
              styles.scrollContent,
              { paddingTop: headerHeight },
            ]}
          >
            <DetailLoadingPlaceholder />
          </View>
        ) : (
          <>
            <ScrollView
              bounces={false}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingTop: scrollTopPadding },
                { paddingBottom: scrollBottomPadding },
              ]}
              onScroll={onScroll}
              scrollEventThrottle={scrollEventThrottle}
              showsVerticalScrollIndicator={false}
            >
              {queryErrorMessage && !isNotFound ? (
                <DetailErrorCard
                  message={queryErrorMessage}
                  onRetry={handleRetry}
                />
              ) : isNotFound || !item || !viewModel || !statusCard ? (
                <DetailNotFoundCard />
              ) : (
                <>
                  {actionErrorMessage ? (
                    <DetailInlineErrorCard message={actionErrorMessage} />
                  ) : null}

                  {viewModel.contentRecovery ? (
                    <DetailInlineErrorCard
                      message={viewModel.contentRecovery.description}
                      title={viewModel.contentRecovery.title}
                    />
                  ) : null}

                  <DetailSummarySection
                    colorKey={viewModel.summary.colorKey}
                    notificationLabel={viewModel.summary.notificationLabel}
                    notificationsEnabled={
                      viewModel.summary.notificationsEnabled
                    }
                    recurrenceLabel={viewModel.summary.recurrenceLabel}
                    settingBadges={viewModel.summary.settingBadges}
                    title={viewModel.summary.title}
                  />

                  <DetailScheduleSection
                    dateLabel={statusCard.dateLabel}
                    metaLabel={statusCard.metaLabel}
                    timeLabel={statusCard.timeLabel}
                    title={statusCard.title}
                  />

                  <DetailHistorySection entries={viewModel.historyPreview} />
                </>
              )}
            </ScrollView>
          </>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    minHeight: 120,
  },
  errorState: {
    minHeight: 120,
  },
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
    backgroundColor: colors.statusCompletedSoft,
    borderColor: colors.statusCompletedBorder,
  },
  historyStatusChipSkipped: {
    backgroundColor: colors.statusSkippedSoft,
    borderColor: colors.statusSkippedBorder,
  },
  historyStatusChipText: {
    fontSize: 11,
  },
  historyStatusChipTextCompleted: {
    color: colors.statusCompletedText,
  },
  historyStatusChipTextSkipped: {
    color: colors.statusSkippedText,
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
  inlineErrorState: {
    minHeight: 96,
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
  statePanel: {
    borderColor: colors.dividerOnPrimary,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
