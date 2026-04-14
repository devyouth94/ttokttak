import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as DropdownMenu from "@rn-primitives/dropdown-menu";
import * as Popover from "@rn-primitives/popover";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  Check,
  CircleAlert,
  EllipsisVertical,
  SkipForward,
} from "lucide-react-native";

import { AppCard } from "~/design-system/components/app-card";
import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import { ScreenHeader } from "~/design-system/components/screen-header";
import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "~/design-system/tokens";
import { HistoryEntryCard } from "~/features/history/components/history-entry-card";
import {
  buildRecurringItemDetailViewModel,
  getItemDetailBasisOccurrence,
  getSummaryNotificationLabel,
  type ItemDetailHistoryEntry,
  type ItemDetailMetaEntry,
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
const ITEM_NOT_FOUND_MESSAGE = "반복 항목을 찾을 수 없습니다.";
const INFO_DESCRIPTION_PARAGRAPH_BREAK = /\n{2,}/g;

function DetailSectionTitle({ title }: { title: string }): React.JSX.Element {
  return (
    <AppText style={styles.sectionTitle} variant="title">
      {title}
    </AppText>
  );
}

function formatInfoDescription(description: string): string {
  return description.replace(INFO_DESCRIPTION_PARAGRAPH_BREAK, "\n");
}

function DetailInfoRow({
  icon,
  value,
}: {
  icon: React.JSX.Element;
  value: string;
}): React.JSX.Element {
  return (
    <View style={styles.infoRow}>
      <AppText style={styles.infoValue}>{value}</AppText>
      {icon}
    </View>
  );
}

function DetailStateCard({
  dateLabel,
  kind,
  metaLabel,
  timeLabel,
  title,
}: {
  dateLabel: string;
  kind: "empty" | "overdue" | "scheduled";
  metaLabel: string;
  timeLabel: string | null;
  title: string;
}): React.JSX.Element {
  return (
    <AppCard
      contentStyle={[
        styles.stateCard,
        kind === "overdue"
          ? styles.stateCardOverdue
          : kind === "scheduled"
            ? styles.stateCardScheduled
            : styles.stateCardEmpty,
      ]}
      shadowStyle={styles.stateShadow}
    >
      <AppText
        style={[styles.eyebrowText, styles.stateEyebrowText]}
        variant="label"
      >
        {title}
      </AppText>
      <AppText
        style={[
          styles.mainTextBase,
          styles.stateMainText,
          kind === "empty" && styles.stateDateEmpty,
        ]}
        variant="display"
      >
        {dateLabel}
      </AppText>
      <AppText style={[styles.secondaryTextBase, styles.stateSecondaryText]}>
        {metaLabel}
      </AppText>
      {timeLabel ? (
        <View style={styles.timePill}>
          <AppText style={styles.timePillText}>{timeLabel}</AppText>
        </View>
      ) : null}
    </AppCard>
  );
}

function DetailSummaryCard({
  category,
  description,
  icon,
  title,
  value,
}: {
  category: string | null;
  description: string | null;
  icon: React.JSX.Element;
  title: string;
  value: string;
}): React.JSX.Element {
  return (
    <AppCard
      contentStyle={styles.summaryCard}
      shadowStyle={styles.summaryShadow}
    >
      <AppText style={styles.eyebrowText} variant="label">
        항목 정보
      </AppText>
      <AppText
        style={[styles.mainTextBase, styles.summaryMainText]}
        variant="title"
      >
        {title}
      </AppText>

      {category ? (
        <AppText style={[styles.secondaryTextBase, styles.summaryCategoryText]}>
          {category}
        </AppText>
      ) : null}

      {description ? (
        <AppText
          style={[styles.secondaryTextBase, styles.summarySecondaryText]}
        >
          {description}
        </AppText>
      ) : null}

      <View style={styles.infoGroup}>
        <DetailInfoRow icon={icon} value={value} />
      </View>
    </AppCard>
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
    <AppCard>
      <View style={styles.errorCard}>
        <View style={styles.errorCopy}>
          <AppText style={styles.errorTitle} variant="title">
            상세 정보를 불러오지 못했습니다.
          </AppText>
          <AppText style={styles.errorDescription}>{message}</AppText>
        </View>

        <Pressable
          accessibilityHint="상세 화면 데이터를 다시 불러옵니다."
          accessibilityLabel="상세 화면 재시도"
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.metaActionButton,
            pressed && styles.metaActionButtonPressed,
          ]}
        >
          <AppText style={styles.metaActionButtonText}>재시도</AppText>
        </Pressable>
      </View>
    </AppCard>
  );
}

function DetailInlineErrorCard({
  message,
}: {
  message: string;
}): React.JSX.Element {
  return (
    <AppCard>
      <View style={styles.errorCard}>
        <View style={styles.errorCopy}>
          <AppText style={styles.errorTitle} variant="title">
            처리를 완료하지 못했습니다.
          </AppText>
          <AppText style={styles.errorDescription}>{message}</AppText>
        </View>
      </View>
    </AppCard>
  );
}

function DetailHistoryCard({
  entry,
}: {
  entry: ItemDetailHistoryEntry;
}): React.JSX.Element {
  return (
    <HistoryEntryCard
      action={entry.action}
      statusLabel={entry.statusLabel}
      timeLabel={entry.timeLabel}
      title={entry.statusLabel}
    />
  );
}

function DetailEmptyCard({
  description,
  title,
}: {
  description: string;
  title: string;
}): React.JSX.Element {
  return (
    <AppCard>
      <View style={styles.emptyCard}>
        <AppText style={styles.emptyTitle} variant="title">
          {title}
        </AppText>
        <AppText style={styles.emptyDescription}>{description}</AppText>
      </View>
    </AppCard>
  );
}

function DetailNotFoundCard(): React.JSX.Element {
  return (
    <AppCard>
      <View style={styles.emptyCard}>
        <AppText style={styles.emptyTitle} variant="title">
          항목을 찾을 수 없습니다.
        </AppText>
        <AppText style={styles.emptyDescription}>
          이미 삭제되었거나 접근할 수 없는 리마인더입니다.
        </AppText>
        <Pressable
          accessibilityHint="홈 화면으로 이동합니다."
          accessibilityLabel="홈으로 이동"
          accessibilityRole="button"
          onPress={() => {
            router.replace("/");
          }}
          style={({ pressed }) => [
            styles.metaActionButton,
            pressed && styles.metaActionButtonPressed,
          ]}
        >
          <AppText style={styles.metaActionButtonText}>홈으로 이동</AppText>
        </Pressable>
      </View>
    </AppCard>
  );
}

function DetailMetaSection({
  entries,
}: {
  entries: ItemDetailMetaEntry[];
}): React.JSX.Element {
  return (
    <AppCard contentStyle={styles.metaCard}>
      {entries.map((entry, index) => (
        <View
          key={entry.id}
          style={[
            styles.metaRow,
            index < entries.length - 1 && styles.metaRowDivider,
          ]}
        >
          <View style={styles.metaLabelRow}>
            <AppText style={styles.metaLabel}>{entry.label}</AppText>
            {entry.infoDescription ? (
              <Popover.Root>
                <Popover.Trigger asChild>
                  <Pressable
                    accessibilityHint={`${entry.label} 설명을 확인합니다.`}
                    accessibilityLabel={`${entry.label} 설명`}
                    accessibilityRole="button"
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.metaInfoButton,
                      pressed && styles.metaInfoButtonPressed,
                    ]}
                  >
                    <CircleAlert color={colors.textMuted} size={15} />
                  </Pressable>
                </Popover.Trigger>

                <Popover.Portal>
                  <Popover.Overlay
                    closeOnPress
                    style={styles.metaInfoPopoverOverlay}
                  />
                  <Popover.Content
                    align="center"
                    avoidCollisions
                    insets={{
                      bottom: spacing.lg,
                      left: spacing.lg,
                      right: spacing.lg,
                      top: spacing.lg,
                    }}
                    side="top"
                    sideOffset={6}
                    style={styles.metaInfoPopoverContent}
                  >
                    <AppText
                      style={styles.metaInfoPopoverTitle}
                      variant="title"
                    >
                      {entry.label}
                    </AppText>
                    <AppText style={styles.metaInfoPopoverText}>
                      {formatInfoDescription(entry.infoDescription)}
                    </AppText>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            ) : null}
          </View>
          <AppText style={styles.metaValue}>{entry.value}</AppText>
        </View>
      ))}
    </AppCard>
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
            accessibilityHint="대표 처리 대상 일정 occurrence를 완료 처리합니다."
            accessibilityLabel="리마인더 완료"
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
            <Check color={colors.text} size={18} />
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
            <SkipForward color={colors.textMuted} size={18} />
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
  scheduledAtUtc,
}: {
  itemId?: string;
  scheduledAtUtc?: string;
}): React.JSX.Element {
  const { isReady, timezone, userId } = useRecurringFeedContext();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
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
    ? "잘못된 항목 경로입니다."
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

  const refetchDetail = async (): Promise<void> => {
    await Promise.all([itemQuery.refetch(), completionLogsQuery.refetch()]);
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

      await queryClient.invalidateQueries({
        queryKey: recurringQueryKeys.user(userId),
      });
      await refetchDetail();
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
      params: { itemId },
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

    Alert.alert("리마인더 삭제", "이 리마인더를 삭제할까요?", [
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
        <ScreenHeader
          onBack={() => {
            router.back();
          }}
          rightSlot={
            item && !queryErrorMessage ? (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Pressable
                    accessibilityHint="리마인더 관리 메뉴를 엽니다."
                    accessibilityLabel="리마인더 관리"
                    accessibilityRole="button"
                    disabled={isMutating}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.headerActionButton,
                      isMutating && styles.actionButtonDisabled,
                      pressed &&
                        !isMutating &&
                        styles.headerActionButtonPressed,
                    ]}
                  >
                    <EllipsisVertical color={colors.text} size={20} />
                  </Pressable>
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
                      left: spacing.lg,
                      right: spacing.lg,
                      top: spacing.lg,
                    }}
                    side="bottom"
                    sideOffset={4}
                    style={styles.managementMenuContent}
                  >
                    <DropdownMenu.Item
                      accessibilityHint="현재 리마인더 수정 화면으로 이동합니다."
                      style={styles.managementMenuItem}
                      onPress={handleEdit}
                    >
                      <AppText style={styles.managementMenuText}>수정</AppText>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                      accessibilityHint="현재 리마인더를 삭제합니다."
                      style={styles.managementMenuItem}
                      onPress={handleDelete}
                    >
                      <AppText style={styles.managementDeleteText}>
                        삭제
                      </AppText>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : undefined
          }
          title="리마인더 상세"
        />

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} size="small" />
            <AppText style={styles.loadingText}>
              리마인더 상세 정보를 불러오는 중입니다.
            </AppText>
          </View>
        ) : (
          <>
            <ScrollView
              bounces={false}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: scrollBottomPadding },
              ]}
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

                  <DetailSummaryCard
                    category={viewModel.summary.category}
                    description={viewModel.summary.description}
                    icon={
                      item.notificationsEnabled ? (
                        <Bell color={colors.textMuted} size={14} />
                      ) : (
                        <BellOff color={colors.textMuted} size={14} />
                      )
                    }
                    title={viewModel.summary.title}
                    value={getSummaryNotificationLabel(item)}
                  />

                  <DetailStateCard
                    dateLabel={viewModel.statusCard.dateLabel}
                    kind={viewModel.statusCard.kind}
                    metaLabel={viewModel.statusCard.metaLabel}
                    timeLabel={null}
                    title={viewModel.statusCard.title}
                  />

                  <View style={styles.sectionBlock}>
                    <DetailSectionTitle title="상세 정보" />
                    <DetailMetaSection entries={viewModel.metaEntries} />
                  </View>

                  <View style={styles.sectionBlock}>
                    <DetailSectionTitle title="최근 히스토리" />
                    {viewModel.historyPreview.length > 0 ? (
                      viewModel.historyPreview.map((entry) => (
                        <DetailHistoryCard entry={entry} key={entry.id} />
                      ))
                    ) : (
                      <DetailEmptyCard
                        description="완료하거나 건너뛴 일정이 생기면 최근 기록 3건을 여기에서 확인할 수 있습니다."
                        title="최근 히스토리가 없습니다."
                      />
                    )}
                  </View>
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
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  emptyDescription: {
    color: colors.textMuted,
    lineHeight: 22,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: typography.title,
    textAlign: "center",
  },
  errorCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  errorCopy: {
    flex: 1,
  },
  errorDescription: {
    color: colors.textMuted,
  },
  errorTitle: {
    fontSize: typography.title,
  },
  eyebrowText: {
    color: colors.textMuted,
    fontSize: typography.label,
    letterSpacing: 1.2,
    lineHeight: 18,
    textAlign: "center",
  },
  headerActionButton: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerActionButtonPressed: {
    opacity: 0.72,
  },
  managementDeleteText: {
    color: colors.error,
    fontSize: typography.label,
    lineHeight: 18,
  },
  managementMenuContent: {
    backgroundColor: colors.surface,
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 148,
    padding: spacing.xs,
    shadowColor: "#000",
    shadowOffset: {
      height: 6,
      width: 0,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  managementMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  managementMenuItem: {
    borderRadius: borderRadius.xl,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  managementMenuItemPressed: {
    backgroundColor: colors.surfaceHigh,
  },
  managementMenuText: {
    color: colors.text,
    fontSize: typography.label,
    lineHeight: 18,
  },
  infoGroup: {
    alignItems: "center",
    marginTop: spacing.xs,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  infoValue: {
    color: colors.textMuted,
    fontSize: typography.label,
    lineHeight: 18,
    textAlign: "center",
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
  },
  loadingText: {
    color: colors.textMuted,
  },
  mainTextBase: {
    fontSize: 24,
    letterSpacing: -0.2,
    lineHeight: 30,
    textAlign: "center",
  },
  metaCard: {
    gap: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  metaActionButton: {
    alignItems: "center",
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  metaActionButtonPressed: {
    backgroundColor: colors.surfaceHigh,
  },
  metaActionButtonText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    fontWeight: "600",
    lineHeight: 22,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  metaInfoButton: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  metaInfoButtonPressed: {
    opacity: 0.6,
  },
  metaInfoPopoverContent: {
    backgroundColor: colors.surface,
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 296,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: "#000",
    shadowOffset: {
      height: 6,
      width: 0,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  metaInfoPopoverOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  metaInfoPopoverText: {
    color: colors.textMuted,
    fontSize: typography.label,
    lineHeight: 20,
    paddingTop: spacing.sm,
  },
  metaInfoPopoverTitle: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  metaLabelRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  metaRowDivider: {
    borderBottomColor: colors.outlineSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metaValue: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "right",
  },
  primaryActionButton: {
    alignItems: "center",
    backgroundColor: colors.secondaryContainer,
    borderRadius: borderRadius.lg,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    height: 44,
    paddingHorizontal: spacing.lg,
  },
  primaryActionButtonPressed: {
    opacity: 0.8,
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
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  secondaryActionButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceHigh,
    borderRadius: borderRadius.lg,
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
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: "600",
    lineHeight: 22,
  },
  secondaryTextBase: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
  sectionBlock: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.title,
  },
  stateCard: {
    alignItems: "center",
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stateCardEmpty: {
    backgroundColor: colors.surfaceHigh,
  },
  stateCardOverdue: {
    backgroundColor: "#68746a",
  },
  stateCardScheduled: {
    backgroundColor: "#5f7268",
  },
  stateDateEmpty: {
    fontSize: typography.title,
    letterSpacing: 0,
    lineHeight: 28,
  },
  stateMainText: {
    color: colors.primaryForeground,
  },
  stateEyebrowText: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  stateSecondaryText: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  stateShadow: {
    elevation: 5,
    shadowRadius: 22,
  },
  summaryCard: {
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  summaryCategoryText: {
    color: colors.secondary,
  },
  summaryMainText: {
    color: colors.text,
  },
  summarySecondaryText: {
    color: colors.textMuted,
    maxWidth: 260,
  },
  summaryShadow: {
    elevation: 4,
    shadowRadius: 18,
  },
  timePill: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: borderRadius.pill,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  timePillText: {
    color: colors.primaryForeground,
    fontSize: typography.label,
    fontWeight: "500",
    lineHeight: 18,
  },
});
