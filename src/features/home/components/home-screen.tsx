import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { format, startOfDay } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  RotateCw,
} from "lucide-react-native";

import { AppCard } from "~/design-system/components/app-card";
import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import { borderRadius, colors, spacing } from "~/design-system/tokens";
import type { CompletionAction } from "~/features/recurring/domain/types";
import {
  createCompletionLog,
  listCompletionLogs,
} from "~/features/recurring/repositories/completion-logs-repository";
import { listRecurringItems } from "~/features/recurring/repositories/recurring-items-repository";
import { useSession } from "~/features/session/session-provider";

import {
  buildHomeFeedSections,
  createHomeDateOptions,
  getOverdueOccurrencesToResolve,
  getProfileName,
  type HomeFeedCard,
  type HomeFeedSection,
} from "./home-screen.helpers";

type HomeFeedData = {
  completionLogs: Awaited<ReturnType<typeof listCompletionLogs>>;
  items: Awaited<ReturnType<typeof listRecurringItems>>;
};

function getHomeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return String(error);
}

async function fetchHomeFeedData({
  timezone,
  userId,
}: {
  timezone: string;
  userId: string;
}): Promise<HomeFeedData> {
  const items = await listRecurringItems({
    timezone,
    userId,
  });

  if (items.length === 0) {
    return {
      completionLogs: [],
      items,
    };
  }

  const completionLogs = await listCompletionLogs({
    itemIds: items.map((item) => item.id),
    userId,
  });

  return {
    completionLogs,
    items,
  };
}

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
    <AppCard>
      <View style={styles.cardRow}>
        <Pressable
          accessibilityHint="반복 항목 상세 화면으로 이동합니다."
          accessibilityLabel={`${card.item.title} 상세 보기`}
          accessibilityRole="button"
          onPress={() => {
            router.push({
              params: { itemId: card.item.id },
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
              accessibilityHint="이 일정 occurrence를 건너뜁니다."
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
              <ArrowRight color={colors.textMuted} size={16} />
            </Pressable>

            <Pressable
              accessibilityHint="이 일정 occurrence를 완료 처리합니다."
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
              <Check color={colors.text} size={16} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </AppCard>
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
        <AppCard>
          <View style={styles.sectionState}>
            <ActivityIndicator color={colors.primary} size="small" />
            <AppText style={styles.sectionStateText}>
              일정을 불러오는 중입니다.
            </AppText>
          </View>
        </AppCard>
      ) : section.items.length === 0 ? (
        <AppCard>
          <View style={styles.sectionState}>
            <AppText style={styles.sectionStateText}>
              {section.emptyMessage}
            </AppText>
          </View>
        </AppCard>
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
    <AppCard>
      <View style={styles.errorCard}>
        <View style={styles.errorCopy}>
          <AppText style={styles.errorTitle} variant="title">
            홈 피드를 불러오지 못했습니다.
          </AppText>
          <AppText style={styles.errorDescription}>{message}</AppText>
        </View>

        <Pressable
          accessibilityHint="홈 피드를 다시 불러옵니다."
          accessibilityLabel="홈 피드 재시도"
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.secondaryActionPressed,
          ]}
        >
          <RotateCw color={colors.text} size={16} />
          <AppText style={styles.retryButtonText}>재시도</AppText>
        </Pressable>
      </View>
    </AppCard>
  );
}

export function HomeScreen(): React.JSX.Element {
  const { profile, user } = useSession();
  const userId = user!.id;
  const [selectedDateId, setSelectedDateId] = useState(() =>
    format(startOfDay(new Date()), "yyyy-MM-dd")
  );
  const [completionLogs, setCompletionLogs] = useState<
    Awaited<ReturnType<typeof listCompletionLogs>>
  >([]);
  const [items, setItems] = useState<
    Awaited<ReturnType<typeof listRecurringItems>>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingOccurrenceIds, setProcessingOccurrenceIds] = useState<
    string[]
  >([]);
  const dateScrollRef = useRef<ScrollView>(null);

  const profileName = getProfileName(profile);
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = startOfDay(new Date());
  const dateOptions = createHomeDateOptions(today);
  const defaultDateId = dateOptions[0].id;
  const selectedDateOption =
    dateOptions.find((option) => option.id === selectedDateId) ??
    dateOptions[0];
  const feedSections = buildHomeFeedSections({
    completionLogs,
    items,
    now: new Date(),
    selectedDateId: selectedDateOption.id,
    timezone,
  }).map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !processingOccurrenceIds.includes(item.id)
    ),
  }));

  useEffect(() => {
    if (selectedDateId === selectedDateOption.id) {
      return;
    }

    setSelectedDateId(defaultDateId);
    dateScrollRef.current?.scrollTo({
      animated: true,
      x: 0,
      y: 0,
    });
  }, [defaultDateId, selectedDateId, selectedDateOption.id]);

  useEffect(() => {
    const loadFeed = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextFeed = await fetchHomeFeedData({
          timezone,
          userId,
        });

        setItems(nextFeed.items);
        setCompletionLogs(nextFeed.completionLogs);
      } catch (error) {
        setErrorMessage(getHomeErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void loadFeed();
  }, [timezone, userId]);

  const reloadFeed = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextFeed = await fetchHomeFeedData({
        timezone,
        userId,
      });

      setItems(nextFeed.items);
      setCompletionLogs(nextFeed.completionLogs);
    } catch (error) {
      setErrorMessage(getHomeErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOccurrenceAction = async (
    card: HomeFeedCard,
    action: CompletionAction
  ) => {
    setProcessingOccurrenceIds((current) =>
      current.includes(card.id) ? current : [...current, card.id]
    );
    setErrorMessage(null);

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

      const nextFeed = await fetchHomeFeedData({
        timezone,
        userId,
      });

      setItems(nextFeed.items);
      setCompletionLogs(nextFeed.completionLogs);
    } catch (error) {
      setErrorMessage(getHomeErrorMessage(error));
    } finally {
      setProcessingOccurrenceIds((current) =>
        current.filter((occurrenceId) => occurrenceId !== card.id)
      );
    }
  };

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <View style={styles.screenRoot}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <AppText style={styles.title} variant="title">
                {"안녕하세요, "}
                {profileName}
                {"님"}
              </AppText>
            </View>

            <View style={styles.headerAction}>
              <Pressable
                accessibilityHint="알림 화면으로 이동합니다."
                accessibilityLabel="알림 열기"
                accessibilityRole="button"
                onPress={() => {
                  router.push("/(tabs)/home/notifications");
                }}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.iconButtonPressed,
                ]}
              >
                <Bell color={colors.text} size={20} />
              </Pressable>
            </View>
          </View>

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
                  setSelectedDateId(dateOptions[0].id);
                  dateScrollRef.current?.scrollTo({
                    animated: true,
                    x: 0,
                    y: 0,
                  });
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
    fontSize: 15,
    lineHeight: 22,
  },
  cardRule: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  cardRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  completeButton: {
    backgroundColor: colors.surfaceHigh,
  },
  contentContainer: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  iconActionButton: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    justifyContent: "center",
    height: 36,
    width: 36,
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
  errorCard: {
    gap: spacing.md,
  },
  errorCopy: {
    gap: spacing.xs,
  },
  errorDescription: {
    color: colors.textMuted,
  },
  errorTitle: {
    fontSize: 18,
    lineHeight: 24,
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
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 60,
    justifyContent: "space-between",
    width: "100%",
  },
  headerAction: {
    alignItems: "flex-end",
    position: "relative",
    zIndex: 20,
  },
  headerCopy: {
    flex: 1,
  },
  iconButton: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  iconButtonPressed: {
    opacity: 0.88,
  },
  primaryActionPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  retryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceHigh,
    borderRadius: borderRadius.pill,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryButtonText: {
    color: colors.text,
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
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 88,
  },
  sectionStateText: {
    color: colors.textMuted,
    textAlign: "center",
  },
  skipButton: {
    backgroundColor: colors.surfaceHigh,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    textAlign: "left",
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
