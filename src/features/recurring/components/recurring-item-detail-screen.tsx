import { type ReactNode, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as DropdownMenu from "@rn-primitives/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  BellOff,
  EllipsisVertical,
} from "lucide-react-native";

import { AppScreen } from "~/design-system/components/app-screen";
import { AppStateView } from "~/design-system/components/app-state";
import { AppText } from "~/design-system/components/app-text";
import { IconButton } from "~/design-system/components/icon-button";
import { ScreenHeader } from "~/design-system/components/screen-header";
import { useCollapsibleHeader } from "~/design-system/hooks/use-collapsible-header";
import {
  borderRadius,
  color,
  colors,
  spacing,
  typography,
} from "~/design-system/tokens";
import { useNotificationBootstrap } from "~/features/notifications/notification-bootstrap";
import {
  buildRecurringItemDetailViewModel,
  getItemDetailBasisOccurrence,
  type ItemDetailHistoryEntry,
  type ItemDetailSummaryBadge,
  shouldShowOccurrenceActions,
} from "~/features/recurring/components/recurring-item-detail-screen.helpers";
import { getOccurrencesToResolve } from "~/features/recurring/domain/occurrence-actions";
import type { CompletionAction } from "~/features/recurring/domain/types";
import { recurringQueryKeys } from "~/features/recurring/hooks/recurring-query-keys";
import { useCompletionLogsForItemQuery } from "~/features/recurring/hooks/use-completion-logs-query";
import { useRecurringFeedContext } from "~/features/recurring/hooks/use-recurring-feed-context";
import { useRecurringItemByIdQuery } from "~/features/recurring/hooks/use-recurring-items-query";
import { createCompletionLog } from "~/features/recurring/repositories/completion-logs-repository";
import { archiveRecurringItem } from "~/features/recurring/repositories/recurring-items-repository";
import { getErrorMessage } from "~/lib/errors/get-error-message";

const ACTION_BAR_HEIGHT = 60;
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
  notificationLabel,
  notificationsEnabled,
  recurrenceLabel,
  settingBadges,
  title,
}: {
  notificationLabel: string;
  notificationsEnabled: boolean;
  recurrenceLabel: string;
  settingBadges: ItemDetailSummaryBadge[];
  title: string;
}): React.JSX.Element {
  const NotificationIcon = notificationsEnabled ? Bell : BellOff;
  const notificationStatusLabel = notificationsEnabled ? "사용" : "중지";

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
                  color={color.jetBlack}
                  size={14}
                  strokeWidth={1.2}
                />
              </View>
            }
            value={notificationLabel}
          />
        </View>

        <View style={styles.summaryOutlineGroup}>
          {settingBadges.map((badge) => (
            <DetailSummaryOutlineRow
              key={badge.id}
              label={badge.label}
              value={badge.value}
            />
          ))}
        </View>
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
}: {
  message: string;
}): React.JSX.Element {
  return (
    <View style={styles.statePanel}>
      <AppStateView
        description={message}
        style={styles.inlineErrorState}
        title="처리를 완료하지 못했어요"
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
  return (
    <View style={[styles.historyRow, !isFirst && styles.historyRowDivider]}>
      <AppText style={styles.historyDate} variant="body3">
        {entry.timeLabel}
      </AppText>
      <AppText style={styles.historyStatus} variant="body3">
        {entry.statusLabel}
      </AppText>
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

function DetailActionBar({
  disabled,
  insetsBottom,
  isProcessing,
  onPress,
}: {
  disabled: boolean;
  insetsBottom: number;
  isProcessing: boolean;
  onPress: (action: CompletionAction) => void;
}): React.JSX.Element {
  return (
    <View
      style={[
        styles.actionBarWrapper,
        {
          paddingBottom: insetsBottom,
        },
      ]}
    >
      <View style={styles.actionBar}>
        <View style={styles.actionRow}>
          <Pressable
            accessibilityHint="대표 처리 대상 일정을 완료 처리해요."
            accessibilityLabel="일정 완료"
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => {
              onPress("completed");
            }}
            style={({ pressed }) => [
              styles.primaryActionButton,
              disabled && styles.actionButtonDisabled,
              pressed && !disabled && styles.primaryActionButtonPressed,
            ]}
          >
            <AppText style={styles.primaryActionButtonText}>완료</AppText>
          </Pressable>

          <Pressable
            accessibilityHint="대표 처리 대상 일정 occurrence를 이번만 건너뜁니다."
            accessibilityLabel="건너뛰기"
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => {
              onPress("skipped");
            }}
            style={({ pressed }) => [
              styles.secondaryActionButton,
              disabled && styles.actionButtonDisabled,
              pressed && !disabled && styles.secondaryActionButtonPressed,
            ]}
          >
            <AppText style={styles.secondaryActionButtonText}>
              {isProcessing ? "처리 중..." : "건너뛰기"}
            </AppText>
          </Pressable>
        </View>
      </View>
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
  const [processingAction, setProcessingAction] =
    useState<CompletionAction | null>(null);
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
  const isProcessing = processingAction !== null;
  const isMutating = isProcessing || isArchiving;
  const isNotFound =
    !item &&
    !isLoading &&
    (queryErrorMessage === ITEM_NOT_FOUND_MESSAGE ||
      queryErrorMessage === null);
  const showsActionBar =
    Boolean(item) &&
    !queryErrorMessage &&
    shouldShowOccurrenceActions({
      occurrence: basisOccurrence,
      now,
      timezone,
    });
  const scrollBottomPadding = showsActionBar
    ? ACTION_BAR_HEIGHT + insets.bottom + spacing.xxl
    : spacing.lg;
  const scrollTopPadding = headerHeight;

  const refetchDetail = async (): Promise<void> => {
    await Promise.all([itemQuery.refetch(), completionLogsQuery.refetch()]);
  };

  const navigateAfterOccurrenceAction = (): void => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  const handleRetry = (): void => {
    setActionErrorMessage(null);
    void refetchDetail();
  };

  const handleOccurrenceAction = async (
    action: CompletionAction
  ): Promise<void> => {
    if (!item || !userId || !basisOccurrence) {
      return;
    }

    setActionErrorMessage(null);
    setProcessingAction(action);

    try {
      const occurrencesToResolve = getOccurrencesToResolve({
        completionLogs,
        item,
        now: new Date(),
        primaryOccurrence: basisOccurrence,
        timezone,
      });
      const existingScheduledAtUtcSet = new Set(
        completionLogs
          .filter((log) => log.itemId === item.id)
          .map((log) => log.scheduledAtUtc)
      );
      const pendingOccurrences = occurrencesToResolve.filter(
        (occurrence) =>
          !existingScheduledAtUtcSet.has(occurrence.scheduledAtUtc)
      );

      if (pendingOccurrences.length > 0) {
        await Promise.all(
          pendingOccurrences.map((occurrence) =>
            createCompletionLog({
              action,
              itemId: item.id,
              scheduledAtUtc: occurrence.scheduledAtUtc,
              userId,
            })
          )
        );
      }

      await syncAfterMutation({
        reason:
          action === "completed"
            ? "occurrence-completed"
            : "occurrence-skipped",
        scope: {
          effectiveFromUtc: new Date().toISOString(),
          itemId: item.id,
          type: "item",
        },
      });

      await queryClient.invalidateQueries({
        queryKey: recurringQueryKeys.user(userId),
      });
      await refetchDetail();
      navigateAfterOccurrenceAction();
    } catch (actionError) {
      setActionErrorMessage(getErrorMessage(actionError));
    } finally {
      setProcessingAction(null);
    }
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

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!item || !userId || isMutating) {
      return;
    }

    setActionErrorMessage(null);
    setIsArchiving(true);

    try {
      await archiveRecurringItem({
        id: item.id,
        userId,
      });

      await syncAfterMutation({
        reason: "item-archived",
        scope: {
          effectiveFromUtc: new Date().toISOString(),
          itemId: item.id,
          type: "item",
        },
      });

      await queryClient.invalidateQueries({
        queryKey: recurringQueryKeys.user(userId),
      });
      router.replace("/");
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
          <ScreenHeader
            leftSlot={
              <Pressable
                accessibilityHint="이전 화면으로 돌아가요."
                accessibilityLabel="뒤로 가기"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  router.back();
                }}
                style={({ pressed }) => [
                  styles.headerBackButton,
                  pressed && styles.headerButtonPressed,
                ]}
              >
                <ArrowLeft color={color.white} size={18} />
              </Pressable>
            }
            onHeightChange={onHeaderHeightChange}
            rightSlot={
              item && !queryErrorMessage ? (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <IconButton
                      accessibilityHint="일정 관리 메뉴를 열어요."
                      accessibilityLabel="일정 관리"
                      disabled={isMutating}
                      icon={
                        <EllipsisVertical color={color.jetBlack} size={20} />
                      }
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
              ) : (
                <View style={styles.headerActionSpacer} />
              )
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
              ) : isNotFound || !item || !viewModel ? (
                <DetailNotFoundCard />
              ) : (
                <>
                  {actionErrorMessage ? (
                    <DetailInlineErrorCard message={actionErrorMessage} />
                  ) : null}

                  <DetailSummarySection
                    notificationLabel={viewModel.summary.notificationLabel}
                    notificationsEnabled={
                      viewModel.summary.notificationsEnabled
                    }
                    recurrenceLabel={viewModel.summary.recurrenceLabel}
                    settingBadges={viewModel.summary.settingBadges}
                    title={viewModel.summary.title}
                  />

                  <DetailScheduleSection
                    dateLabel={viewModel.statusCard.dateLabel}
                    metaLabel={viewModel.statusCard.metaLabel}
                    timeLabel={viewModel.statusCard.timeLabel}
                    title={viewModel.statusCard.title}
                  />

                  <DetailHistorySection entries={viewModel.historyPreview} />
                </>
              )}
            </ScrollView>

            {showsActionBar && item && viewModel ? (
              <DetailActionBar
                disabled={isMutating}
                insetsBottom={insets.bottom}
                isProcessing={isProcessing}
                onPress={(action) => {
                  void handleOccurrenceAction(action);
                }}
              />
            ) : null}
          </>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    alignItems: "center",
    backgroundColor: colors.background,
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: ACTION_BAR_HEIGHT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionBarWrapper: {
    backgroundColor: colors.background,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  emptyCard: {
    minHeight: 120,
  },
  errorState: {
    minHeight: 120,
  },
  headerActionSpacer: {
    height: 48,
    width: 48,
  },
  headerBackButton: {
    alignItems: "center",
    backgroundColor: color.jetBlack,
    borderRadius: borderRadius.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  headerButtonPressed: {
    opacity: 0.88,
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
    borderTopColor: color.jetBlack,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  historySection: {
    backgroundColor: color.smokyWhite,
    borderRadius: borderRadius.xl,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  historySectionLabel: {
    color: color.jetBlack,
  },
  historyStatus: {
    color: colors.textMuted,
  },
  managementDeleteText: {
    color: colors.error,
  },
  managementMenuContent: {
    backgroundColor: color.smokyWhite,
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
    color: color.jetBlack,
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
    backgroundColor: color.smokyWhite,
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
    backgroundColor: color.white,
    borderRadius: borderRadius.pill,
    flex: 1,
    height: 20,
  },
  loadingHistoryDivider: {
    borderTopColor: color.jetBlack,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  loadingHistoryLabel: {
    backgroundColor: color.white,
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
    backgroundColor: color.smokyWhite,
    borderRadius: borderRadius.xl,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  loadingHistoryStatus: {
    backgroundColor: color.white,
    borderRadius: borderRadius.pill,
    height: 20,
    width: 52,
  },
  loadingScheduleDate: {
    backgroundColor: color.white,
    borderRadius: borderRadius.pill,
    height: typography.lineHeight.title,
    width: 96,
  },
  loadingScheduleLabel: {
    backgroundColor: color.white,
    borderRadius: borderRadius.pill,
    height: typography.lineHeight.caption,
    width: 64,
  },
  loadingScheduleMeta: {
    backgroundColor: color.white,
    borderRadius: borderRadius.pill,
    height: 20,
    width: 144,
  },
  loadingScheduleSection: {
    backgroundColor: color.smokyWhite,
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
    backgroundColor: color.smokyWhite,
    borderRadius: borderRadius.pill,
    height: typography.lineHeight.title,
    width: "48%",
  },
  primaryActionButton: {
    alignItems: "center",
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    height: 44,
    paddingHorizontal: spacing.lg,
  },
  primaryActionButtonPressed: {
    opacity: 0.72,
  },
  primaryActionButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "600",
    lineHeight: 22,
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
  secondaryActionButton: {
    alignItems: "center",
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    height: 44,
    paddingHorizontal: spacing.lg,
  },
  secondaryActionButtonPressed: {
    opacity: 0.72,
  },
  secondaryActionButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "600",
    lineHeight: 22,
  },
  scheduleDate: {
    color: color.white,
    textAlign: "left",
  },
  scheduleMetaText: {
    color: color.white,
    flexShrink: 1,
  },
  scheduleSection: {
    alignItems: "flex-start",
    backgroundColor: color.royalBlue,
    borderRadius: borderRadius.xl,
    gap: spacing.xxs,
    padding: spacing.md,
  },
  scheduleTitle: {
    color: color.white,
  },
  summaryBadgeStack: {
    alignItems: "center",
    gap: spacing.xxs,
    maxWidth: "100%",
  },
  summaryOutlineContent: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 4,
    minWidth: 0,
  },
  summaryOutlineLabel: {
    color: color.jetBlack,
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
    borderColor: color.jetBlack,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xxs,
    maxWidth: "100%",
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  summaryOutlineValue: {
    color: color.jetBlack,
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
    color: color.jetBlack,
    textAlign: "center",
  },
  statePanel: {
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
