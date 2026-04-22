import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { RotateCw } from "lucide-react-native";

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
import { useInfiniteCompletionLogsQuery } from "~/features/recurring/hooks/use-completion-logs-query";
import { useRecurringFeedContext } from "~/features/recurring/hooks/use-recurring-feed-context";
import { useRecurringItemsQuery } from "~/features/recurring/hooks/use-recurring-items-query";
import { getErrorMessage } from "~/lib/errors/get-error-message";

import { buildHistorySections } from "./history-screen.helpers";

function HistoryCard({
  entry,
}: {
  entry: {
    action: "completed" | "skipped";
    itemId: string;
    scheduledAtUtc: string;
    statusLabel: string;
    timeLabel: string;
    title: string;
  };
}): React.JSX.Element {
  return (
    <HistoryEntryCard
      action={entry.action}
      onPress={() => {
        router.push({
          params: {
            itemId: entry.itemId,
            returnTo: "/history",
            scheduledAtUtc: entry.scheduledAtUtc,
          },
          pathname: "/items/[itemId]",
        });
      }}
      pressableAccessibilityHint="반복 항목 상세 화면으로 이동합니다."
      pressableAccessibilityLabel={`${entry.title} 상세 보기`}
      statusLabel={entry.statusLabel}
      timeLabel={entry.timeLabel}
      title={entry.title}
    />
  );
}

function HistoryEmptyState(): React.JSX.Element {
  return (
    <View style={styles.emptyState}>
      <AppText style={styles.emptyTitle} variant="title">
        아직 히스토리가 없습니다.
      </AppText>
      <AppText style={styles.emptyDescription}>
        완료하거나 건너뛴 일정이 쌓이면 이 화면에서 날짜순으로 확인할 수
        있습니다.
      </AppText>
    </View>
  );
}

function HistoryErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => Promise<void>;
}): React.JSX.Element {
  return (
    <AppCard>
      <View style={styles.errorCard}>
        <AppText style={styles.errorTitle} variant="title">
          히스토리를 불러오지 못했습니다.
        </AppText>
        <AppText style={styles.errorDescription}>{message}</AppText>
        <Pressable
          accessibilityHint="히스토리 조회를 다시 시도합니다."
          accessibilityLabel="히스토리 재시도"
          accessibilityRole="button"
          onPress={() => {
            void onRetry();
          }}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
          ]}
        >
          <RotateCw color={colors.text} size={16} />
          <AppText style={styles.retryButtonText}>재시도</AppText>
        </Pressable>
      </View>
    </AppCard>
  );
}

export function HistoryScreen(): React.JSX.Element {
  const { isReady, timezone, userId } = useRecurringFeedContext();
  const isFocused = useIsFocused();
  const [manualErrorMessage, setManualErrorMessage] = useState<string | null>(
    null
  );
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const hasFocusedOnceRef = useRef(false);
  const itemsQuery = useRecurringItemsQuery({
    enabled: isReady,
    timezone,
    userId,
  });
  const items = itemsQuery.data ?? [];
  const completionLogsQuery = useInfiniteCompletionLogsQuery({
    enabled: isReady,
    itemIds: items.map((item) => item.id),
    userId,
  });
  const completionLogs =
    completionLogsQuery.data?.pages.flatMap((page) => page) ?? [];
  const refetchItems = itemsQuery.refetch;
  const refetchCompletionLogs = completionLogsQuery.refetch;
  const refetchFeed = async (): Promise<void> => {
    await Promise.all([refetchItems(), refetchCompletionLogs()]);
  };
  const isLoading =
    itemsQuery.isPending || (items.length > 0 && completionLogsQuery.isPending);
  const errorMessage =
    manualErrorMessage ??
    (itemsQuery.error
      ? getErrorMessage(itemsQuery.error)
      : completionLogsQuery.error
        ? getErrorMessage(completionLogsQuery.error)
        : null);

  const sections = buildHistorySections({
    completionLogs,
    items,
    timezone,
  });
  const sectionListSections = sections.map((section) => ({
    ...section,
    data: section.items,
    isFirstSection: false,
  }));
  const sectionListSectionsWithSpacing = sectionListSections.map(
    (section, index) => ({
      ...section,
      isFirstSection: index === 0,
    })
  );

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

  const reloadFeed = async ({
    showsRefreshingIndicator = false,
  }: {
    showsRefreshingIndicator?: boolean;
  } = {}) => {
    setManualErrorMessage(null);

    if (showsRefreshingIndicator) {
      setIsManualRefreshing(true);
    }

    try {
      await refetchFeed();
    } finally {
      if (showsRefreshingIndicator) {
        setIsManualRefreshing(false);
      }
    }
  };

  const handleEndReached = () => {
    if (
      !completionLogsQuery.hasNextPage ||
      completionLogsQuery.isFetchingNextPage
    ) {
      return;
    }

    void completionLogsQuery.fetchNextPage().catch((error) => {
      setManualErrorMessage(getErrorMessage(error));
    });
  };

  if (!isReady || !userId) {
    return (
      <AppScreen>
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.screenRoot}>
        <ScreenHeader title="히스토리" />

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        ) : (
          <SectionList
            bounces={false}
            contentContainerStyle={styles.contentContainer}
            keyExtractor={(entry) => entry.id}
            ListEmptyComponent={!errorMessage ? <HistoryEmptyState /> : null}
            ListFooterComponent={
              completionLogsQuery.isFetchingNextPage ? (
                <View style={styles.footerLoading}>
                  <ActivityIndicator color={colors.primary} size="small" />
                </View>
              ) : null
            }
            ListHeaderComponent={
              errorMessage ? (
                <View style={styles.listHeader}>
                  <HistoryErrorCard
                    message={errorMessage}
                    onRetry={reloadFeed}
                  />
                </View>
              ) : null
            }
            ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.35}
            refreshControl={
              <RefreshControl
                onRefresh={() => {
                  void reloadFeed({ showsRefreshingIndicator: true });
                }}
                refreshing={isManualRefreshing}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.itemContainer}>
                <HistoryCard entry={item} />
              </View>
            )}
            renderSectionFooter={() => null}
            renderSectionHeader={({ section }) => (
              <View
                style={
                  section.isFirstSection
                    ? styles.sectionHeader
                    : styles.sectionHeaderWithSpacing
                }
              >
                <AppText style={styles.sectionTitle} variant="label">
                  {section.title}
                </AppText>
              </View>
            )}
            sections={errorMessage ? [] : sectionListSectionsWithSpacing}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
  },
  footerLoading: {
    paddingBottom: spacing.lg,
  },
  itemContainer: {
    paddingHorizontal: spacing.lg,
  },
  itemSeparator: {
    height: spacing.lg,
  },
  emptyDescription: {
    color: colors.textMuted,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  emptyTitle: {
    textAlign: "center",
  },
  errorCard: {
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  errorDescription: {
    color: colors.textMuted,
  },
  errorTitle: {
    fontSize: 18,
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  listHeader: {
    paddingHorizontal: spacing.lg,
  },
  retryButton: {
    alignItems: "center",
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryButtonPressed: {
    opacity: 0.88,
  },
  retryButtonText: {
    color: colors.text,
  },
  screenRoot: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
  },
  sectionHeaderWithSpacing: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
  },
  sectionTitle: {
    color: colors.textSoft,
    fontSize: typography.label,
    lineHeight: typography.label,
    marginBottom: spacing.sm,
  },
});
