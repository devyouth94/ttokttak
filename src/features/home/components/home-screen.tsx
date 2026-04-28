import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { format, startOfDay } from "date-fns";
import {
  ArrowLeft,
  Check,
  Plus,
  RotateCw,
  SkipForward,
} from "lucide-react-native";

import { AppScreen } from "~/design-system/components/app-screen";
import {
  AppStatePlaceholder,
  AppStateView,
} from "~/design-system/components/app-state";
import { AppText } from "~/design-system/components/app-text";
import { borderRadius, colors, spacing } from "~/design-system/tokens";
import { useNotificationBootstrap } from "~/features/notifications/notification-bootstrap";
import { useNotificationInboxItemsQuery } from "~/features/notifications/use-notification-inbox-items-query";
import type { CompletionAction } from "~/features/recurring/domain/types";
import { recurringQueryKeys } from "~/features/recurring/hooks/recurring-query-keys";
import { useCompletionLogsQuery } from "~/features/recurring/hooks/use-completion-logs-query";
import { useRecurringFeedContext } from "~/features/recurring/hooks/use-recurring-feed-context";
import { useRecurringItemsQuery } from "~/features/recurring/hooks/use-recurring-items-query";
import { createCompletionLog } from "~/features/recurring/repositories/completion-logs-repository";
import { useSession } from "~/features/session/session-provider";
import { getErrorMessage } from "~/lib/errors/get-error-message";

import { HomeHeader } from "./home-header";
import {
  buildHomeFeedSections,
  createHomeDateOptions,
  getOverdueOccurrencesToResolve,
  getProfileName,
  type HomeFeedCard,
  type HomeFeedSection,
} from "./home-screen.helpers";

let hasShownNotificationPermissionPrompt = false;
const HOME_NOTIFICATION_INBOX_LIMIT = 50;

type HomeSectionCardProps = {
  card: HomeFeedCard;
  isProcessing: boolean;
  onAction: (card: HomeFeedCard, action: CompletionAction) => void;
  showsActions: boolean;
};

function HomeSectionCard({
  card,
  isProcessing,
  onAction,
  showsActions,
}: HomeSectionCardProps): React.JSX.Element {
  const metaLine = [card.metaLabel, card.timeLabel]
    .filter((value): value is string => Boolean(value))
    .join(" · ");

  return (
    <View style={styles.feedCard}>
      <Pressable
        accessibilityHint="반복 항목 상세 화면으로 이동해요."
        accessibilityLabel={`${card.item.title} 상세 보기`}
        accessibilityRole="button"
        onPress={() => {
          router.push({
            params: {
              itemId: card.item.id,
              returnTo: "/home",
              scheduledAtUtc: card.occurrence.scheduledAtUtc,
            },
            pathname: "/items/[itemId]",
          });
        }}
        style={({ pressed }) => [
          styles.cardBodyButton,
          pressed && styles.cardBodyButtonPressed,
        ]}
      >
        <View style={styles.cardCopy}>
          <AppText style={styles.cardTitle} variant="title">
            {card.item.title}
          </AppText>
          <AppText style={styles.cardMeta}>{metaLine}</AppText>
          <AppText style={styles.cardRule}>{card.recurrenceLabel}</AppText>
        </View>
      </Pressable>

      {showsActions ? (
        <View style={styles.cardActionRow}>
          <Pressable
            accessibilityHint="이 일정을 건너뛰어요."
            accessibilityLabel={`${card.item.title} 건너뛰기`}
            accessibilityRole="button"
            disabled={isProcessing}
            onPress={() => {
              onAction(card, "skipped");
            }}
            style={({ pressed }) => [
              styles.iconActionButton,
              styles.skipButton,
              pressed && styles.secondaryActionPressed,
            ]}
          >
            <SkipForward color={colors.statusSkippedText} size={16} />
          </Pressable>

          <Pressable
            accessibilityHint="이 일정을 완료 처리해요."
            accessibilityLabel={`${card.item.title} 완료`}
            accessibilityRole="button"
            disabled={isProcessing}
            onPress={() => {
              onAction(card, "completed");
            }}
            style={({ pressed }) => [
              styles.iconActionButton,
              styles.completeButton,
              pressed && styles.primaryActionPressed,
            ]}
          >
            <Check color={colors.statusCompletedText} size={16} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

type HomeFeedSectionBlockProps = {
  isLoading: boolean;
  onAction: (card: HomeFeedCard, action: CompletionAction) => void;
  processingOccurrenceIds: string[];
  selectedDateIsToday: boolean;
  section: HomeFeedSection;
};

function HomeFeedSectionBlock({
  isLoading,
  onAction,
  processingOccurrenceIds,
  selectedDateIsToday,
  section,
}: HomeFeedSectionBlockProps): React.JSX.Element {
  const showsActions =
    section.id === "overdue" ||
    (section.id === "selected-date" && selectedDateIsToday);

  return (
    <View style={styles.feedSection}>
      <AppText style={styles.feedSectionTitle} variant="title">
        {section.title}
      </AppText>

      {isLoading ? (
        <View style={[styles.feedCard, styles.sectionStateCard]}>
          <AppStatePlaceholder rowCount={1} />
        </View>
      ) : section.items.length === 0 ? (
        <View style={[styles.feedCard, styles.sectionStateCard]}>
          <AppStateView
            action={
              section.id === "selected-date"
                ? {
                    accessibilityHint: "리마인더 만들기 화면으로 이동해요.",
                    accessibilityLabel: "리마인더 만들기",
                    icon: <Plus color={colors.text} size={16} />,
                    label: "리마인더 만들기",
                    onPress: () => {
                      router.push({
                        params: { returnTo: "/home" },
                        pathname: "/items/new",
                      });
                    },
                  }
                : undefined
            }
            style={styles.sectionState}
            title={section.emptyMessage}
          />
        </View>
      ) : (
        section.items.map((card) => (
          <HomeSectionCard
            card={card}
            isProcessing={processingOccurrenceIds.includes(card.id)}
            key={card.id}
            onAction={onAction}
            showsActions={showsActions}
          />
        ))
      )}
    </View>
  );
}

type FeedErrorCardProps = {
  message: string;
  onRetry: () => void;
};

function FeedErrorCard({
  message,
  onRetry,
}: FeedErrorCardProps): React.JSX.Element {
  return (
    <View style={[styles.feedCard, styles.sectionStateCard]}>
      <AppStateView
        action={{
          accessibilityHint: "홈 피드를 다시 불러와요.",
          accessibilityLabel: "홈 피드 다시 시도",
          icon: <RotateCw color={colors.text} size={16} />,
          label: "다시 시도",
          onPress: onRetry,
        }}
        description={message}
        style={styles.errorState}
        title="홈 피드를 불러오지 못했어요"
      />
    </View>
  );
}

export function HomeScreen(): React.JSX.Element {
  const { profile } = useSession();
  const { permission, requestPermission, syncAfterMutation } =
    useNotificationBootstrap();
  const { isReady, timezone, userId } = useRecurringFeedContext();
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const [selectedDateId, setSelectedDateId] = useState(() =>
    format(startOfDay(new Date()), "yyyy-MM-dd")
  );
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(
    null
  );
  const [processingOccurrenceIds, setProcessingOccurrenceIds] = useState<
    string[]
  >([]);
  const dateScrollRef = useRef<ScrollView>(null);
  const hasFocusedOnceRef = useRef(false);

  const profileName = getProfileName(profile);
  const itemsQuery = useRecurringItemsQuery({
    enabled: isReady,
    timezone,
    userId,
  });
  const items = itemsQuery.data ?? [];
  const completionLogsQuery = useCompletionLogsQuery({
    enabled: isReady,
    itemIds: items.map((item) => item.id),
    userId,
  });
  const completionLogs = completionLogsQuery.data ?? [];
  const inboxItemsQuery = useNotificationInboxItemsQuery({
    enabled: isReady,
    limit: HOME_NOTIFICATION_INBOX_LIMIT,
  });
  const hasUnreadNotification = Boolean(
    inboxItemsQuery.data?.some((item) => !item.readAt)
  );
  const refetchItems = itemsQuery.refetch;
  const refetchCompletionLogs = completionLogsQuery.refetch;
  const refetchFeed = async (): Promise<void> => {
    await Promise.all([refetchItems(), refetchCompletionLogs()]);
  };
  const isLoading =
    itemsQuery.isPending || (items.length > 0 && completionLogsQuery.isPending);
  const errorMessage =
    actionErrorMessage ??
    (itemsQuery.error
      ? getErrorMessage(itemsQuery.error)
      : completionLogsQuery.error
        ? getErrorMessage(completionLogsQuery.error)
        : null);
  const today = startOfDay(new Date());
  const dateOptions = createHomeDateOptions(today);
  const todayOption = dateOptions[0];
  const selectedDateOption =
    dateOptions.find((option) => option.id === selectedDateId) ?? todayOption;
  const processingOccurrenceIdSet = new Set(processingOccurrenceIds);
  const scrollDateOptionsToStart = (): void => {
    dateScrollRef.current?.scrollTo({
      animated: true,
      x: 0,
      y: 0,
    });
  };
  const feedSections = buildHomeFeedSections({
    completionLogs,
    items,
    now: new Date(),
    selectedDateId: selectedDateOption.id,
    timezone,
  }).map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !processingOccurrenceIdSet.has(item.id)
    ),
  }));

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (selectedDateId === selectedDateOption.id) {
      return;
    }

    setSelectedDateId(todayOption.id);
    scrollDateOptionsToStart();
  }, [isReady, selectedDateId, selectedDateOption.id, todayOption.id]);

  useEffect(() => {
    if (!isFocused || !isReady || !userId) {
      return;
    }

    if (!hasFocusedOnceRef.current) {
      hasFocusedOnceRef.current = true;
      return;
    }

    void Promise.all([refetchItems(), refetchCompletionLogs()]);
  }, [isFocused, isReady, refetchCompletionLogs, refetchItems, userId]);

  useEffect(() => {
    if (
      hasShownNotificationPermissionPrompt ||
      !isFocused ||
      !isReady ||
      !userId ||
      permission.status === "granted" ||
      permission.status === "unsupported" ||
      !permission.canRequest
    ) {
      return;
    }

    hasShownNotificationPermissionPrompt = true;

    Alert.alert(
      "알림을 켤까요?",
      "리마인더 시간에 맞춰 알려드리려면 알림 권한이 필요해요.",
      [
        {
          style: "cancel",
          text: "나중에",
        },
        {
          onPress: () => {
            void requestPermission().catch((error) => {
              Alert.alert(
                "권한을 요청하지 못했어요",
                error instanceof Error ? error.message : String(error)
              );
            });
          },
          text: "허용하기",
        },
      ]
    );
  }, [
    isFocused,
    isReady,
    permission.canRequest,
    permission.status,
    requestPermission,
    userId,
  ]);

  const reloadFeed = async () => {
    setActionErrorMessage(null);
    await refetchFeed();
  };

  const handleOccurrenceAction = async (
    card: HomeFeedCard,
    action: CompletionAction
  ) => {
    if (!userId) {
      return;
    }

    setProcessingOccurrenceIds((current) =>
      current.includes(card.id) ? current : [...current, card.id]
    );
    setActionErrorMessage(null);

    try {
      const occurrencesToResolve = getOverdueOccurrencesToResolve({
        card,
        completionLogs,
        now: new Date(),
        timezone,
      });
      const existingScheduledAtUtcSet = new Set(
        completionLogs
          .filter((log) => log.itemId === card.item.id)
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
              itemId: card.item.id,
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
          itemId: card.item.id,
          type: "item",
        },
      });

      await queryClient.invalidateQueries({
        queryKey: recurringQueryKeys.user(userId),
      });
      await refetchFeed();
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error));
    } finally {
      setProcessingOccurrenceIds((current) =>
        current.filter((occurrenceId) => occurrenceId !== card.id)
      );
    }
  };

  if (!isReady || !userId) {
    return (
      <AppScreen>
        <AppStatePlaceholder rowCount={3} showHeader />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <View style={styles.screenRoot}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <HomeHeader
            hasUnreadNotification={hasUnreadNotification}
            profileName={profileName}
          />

          <View style={styles.carouselSection}>
            <ScrollView
              contentContainerStyle={styles.carouselContent}
              horizontal
              ref={dateScrollRef}
              showsHorizontalScrollIndicator={false}
            >
              {dateOptions.map((option) => {
                const isSelected = option.id === selectedDateOption.id;

                return (
                  <Pressable
                    accessibilityHint={`${option.title} 일정 기준으로 홈 피드를 바꿉니다.`}
                    accessibilityLabel={`${option.title} 선택`}
                    accessibilityRole="button"
                    key={option.id}
                    onPress={() => {
                      setSelectedDateId(option.id);
                    }}
                    style={({ pressed }) => [
                      styles.dateChip,
                      isSelected && styles.dateChipSelected,
                      pressed && styles.dateChipPressed,
                    ]}
                  >
                    <AppText
                      style={
                        isSelected
                          ? styles.dateChipLabelSelected
                          : styles.dateChipLabel
                      }
                      variant="label"
                    >
                      {option.dayLabel}
                    </AppText>
                    <AppText
                      style={
                        isSelected
                          ? styles.dateChipValueSelected
                          : styles.dateChipValue
                      }
                      variant="title"
                    >
                      {option.value}
                    </AppText>
                    {option.isToday ? (
                      <View
                        style={[
                          styles.todayDot,
                          isSelected && styles.todayDotSelected,
                        ]}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            {!selectedDateOption.isToday ? (
              <Pressable
                accessibilityHint="오늘 기준 홈 피드로 즉시 돌아갑니다."
                accessibilityLabel="오늘로 돌아가기"
                accessibilityRole="button"
                onPress={() => {
                  setSelectedDateId(todayOption.id);
                  scrollDateOptionsToStart();
                }}
                style={({ pressed }) => [
                  styles.todayShortcutButton,
                  pressed && styles.todayShortcutButtonPressed,
                ]}
              >
                <View style={styles.todayShortcutIcon}>
                  <ArrowLeft color={colors.secondaryForeground} size={14} />
                </View>
                <AppText style={styles.todayShortcutText}>
                  오늘로 돌아가기
                </AppText>
              </Pressable>
            ) : null}
          </View>

          {errorMessage ? (
            <FeedErrorCard message={errorMessage} onRetry={reloadFeed} />
          ) : null}

          <View style={styles.feedSectionList}>
            {feedSections.map((section) => (
              <HomeFeedSectionBlock
                isLoading={isLoading}
                key={section.id}
                onAction={handleOccurrenceAction}
                processingOccurrenceIds={processingOccurrenceIds}
                selectedDateIsToday={selectedDateOption.isToday}
                section={section}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  carouselContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  carouselSection: {
    gap: spacing.md,
  },
  cardActionRow: {
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "flex-start",
  },
  cardBodyButton: {
    flex: 1,
  },
  cardBodyButtonPressed: {
    opacity: 0.88,
  },
  cardCopy: {
    flex: 1,
    gap: 4,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  cardRule: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  feedCard: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  completeButton: {
    backgroundColor: colors.statusCompletedSoft,
  },
  contentContainer: {
    gap: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  iconActionButton: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    justifyContent: "center",
    height: 32,
    width: 32,
  },
  dateChip: {
    alignItems: "center",
    backgroundColor: colors.surfaceHigh,
    borderRadius: borderRadius.pill,
    justifyContent: "center",
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: "relative",
    width: 56,
  },
  dateChipLabel: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  dateChipLabelSelected: {
    color: colors.primaryForeground,
    marginBottom: spacing.xs,
  },
  dateChipPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  dateChipSelected: {
    backgroundColor: colors.primary,
  },
  dateChipValue: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 24,
  },
  dateChipValueSelected: {
    color: colors.primaryForeground,
    fontSize: 20,
    lineHeight: 24,
  },
  errorState: {
    minHeight: 112,
  },
  feedSection: {
    gap: spacing.md,
  },
  feedSectionList: {
    gap: spacing.xl,
  },
  feedSectionTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  primaryActionPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  screenContent: {
    position: "relative",
  },
  screenRoot: {
    flex: 1,
  },
  secondaryActionPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  sectionState: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 88,
  },
  sectionStateCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipButton: {
    backgroundColor: colors.statusSkippedSoft,
  },
  todayDot: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    bottom: 8,
    height: 6,
    position: "absolute",
    width: 6,
  },
  todayDotSelected: {
    backgroundColor: colors.primaryForeground,
  },
  todayShortcutButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    borderRadius: borderRadius.pill,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  todayShortcutButtonPressed: {
    opacity: 0.88,
  },
  todayShortcutIcon: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  todayShortcutText: {
    color: colors.secondaryForeground,
    fontSize: 14,
    lineHeight: 20,
  },
});
