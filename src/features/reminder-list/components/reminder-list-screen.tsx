import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItem,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { ChevronRight, Plus } from "lucide-react-native";

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
import { useCompletionLogsQuery } from "~/features/recurring/hooks/use-completion-logs-query";
import { useRecurringFeedContext } from "~/features/recurring/hooks/use-recurring-feed-context";
import { useRecurringItemsQuery } from "~/features/recurring/hooks/use-recurring-items-query";

import {
  buildReminderListEntries,
  type ReminderListEntry,
} from "../reminder-list.helpers";

function ReminderCard({
  entry,
}: {
  entry: ReminderListEntry;
}): React.JSX.Element {
  return (
    <AppCard contentStyle={styles.cardContent}>
      <Pressable
        accessibilityHint="리마인더 상세 화면으로 이동합니다."
        accessibilityLabel={`${entry.title} 상세 보기`}
        accessibilityRole="button"
        onPress={() => {
          router.push({
            params: {
              itemId: entry.id,
              returnTo: "/schedule",
              ...(entry.nextScheduledAtUtc
                ? { scheduledAtUtc: entry.nextScheduledAtUtc }
                : {}),
            },
            pathname: "/items/[itemId]",
          });
        }}
        style={({ pressed }) => [
          styles.cardPressable,
          pressed ? styles.pressed : undefined,
        ]}
      >
        <View style={styles.cardCopy}>
          <View style={styles.cardTitleRow}>
            <AppText
              ellipsizeMode="tail"
              numberOfLines={1}
              style={styles.cardTitle}
              variant="title"
            >
              {entry.title}
            </AppText>
            <View style={styles.recurrenceBadge}>
              <AppText
                ellipsizeMode="tail"
                numberOfLines={1}
                style={styles.recurrenceBadgeText}
                variant="label"
              >
                {entry.recurrenceLabel}
              </AppText>
            </View>
          </View>
          <AppText numberOfLines={1} style={styles.nextOccurrence}>
            {entry.nextOccurrenceLabel}
          </AppText>
        </View>
        <ChevronRight color={colors.textMuted} size={18} />
      </Pressable>
    </AppCard>
  );
}

function EmptyState(): React.JSX.Element {
  return (
    <View style={styles.emptyState}>
      <AppText style={styles.emptyTitle} variant="title">
        등록된 리마인더가 없습니다.
      </AppText>
      <AppText style={styles.emptyDescription}>
        리마인더를 추가하면 이곳에서 한눈에 볼 수 있습니다.
      </AppText>
      <Pressable
        accessibilityHint="리마인더 추가 화면으로 이동합니다."
        accessibilityLabel="리마인더 추가"
        accessibilityRole="button"
        onPress={() => {
          router.push({
            params: { returnTo: "/schedule" },
            pathname: "/items/new",
          });
        }}
        style={({ pressed }) => [
          styles.emptyAction,
          pressed ? styles.pressed : undefined,
        ]}
      >
        <Plus color={colors.primaryForeground} size={16} />
        <AppText style={styles.emptyActionText} variant="label">
          리마인더 추가
        </AppText>
      </Pressable>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <View style={styles.emptyState}>
      <AppText style={styles.emptyTitle} variant="title">
        리마인더를 불러오지 못했습니다.
      </AppText>
      <Pressable
        accessibilityHint="리마인더 목록 조회를 다시 시도합니다."
        accessibilityLabel="리마인더 다시 불러오기"
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.retryButton,
          pressed ? styles.pressed : undefined,
        ]}
      >
        <AppText style={styles.retryButtonText} variant="label">
          다시 시도
        </AppText>
      </Pressable>
    </View>
  );
}

export function ReminderListScreen(): React.JSX.Element {
  const { isReady, timezone, userId } = useRecurringFeedContext();
  const itemsQuery = useRecurringItemsQuery({
    enabled: isReady,
    timezone,
    userId,
  });
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const completionLogsQuery = useCompletionLogsQuery({
    enabled: isReady,
    itemIds,
    userId,
  });
  const entries = useMemo(
    () =>
      buildReminderListEntries({
        completionLogs: completionLogsQuery.data ?? [],
        items,
        now: new Date(),
        timezone,
      }),
    [completionLogsQuery.data, items, timezone]
  );
  const isInitialLoading =
    !isReady ||
    itemsQuery.isLoading ||
    (itemIds.length > 0 && completionLogsQuery.isLoading);
  const error = itemsQuery.error ?? completionLogsQuery.error;
  const isRefreshing =
    itemsQuery.isRefetching || completionLogsQuery.isRefetching;

  const handleRetry = useCallback(() => {
    void itemsQuery.refetch();
    if (itemIds.length > 0) {
      void completionLogsQuery.refetch();
    }
  }, [completionLogsQuery, itemIds.length, itemsQuery]);

  const handleRefresh = useCallback(() => {
    void itemsQuery.refetch();
    if (itemIds.length > 0) {
      void completionLogsQuery.refetch();
    }
  }, [completionLogsQuery, itemIds.length, itemsQuery]);

  const renderItem = useCallback<ListRenderItem<ReminderListEntry>>(
    ({ item }) => <ReminderCard entry={item} />,
    []
  );

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <ScreenHeader title="리마인더 목록" />

      {isInitialLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : error ? (
        <ErrorState onRetry={handleRetry} />
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            entries.length === 0 ? styles.emptyListContent : undefined,
          ]}
          data={entries}
          keyExtractor={keyExtractor}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              onRefresh={handleRefresh}
              refreshing={isRefreshing}
              tintColor={colors.primary}
            />
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </AppScreen>
  );
}

function keyExtractor(entry: ReminderListEntry): string {
  return entry.id;
}

const styles = StyleSheet.create({
  cardContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cardCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  cardTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 0,
  },
  cardPressable: {
    alignItems: "center",
    borderRadius: borderRadius.md,
    flexDirection: "row",
    gap: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    lineHeight: 25,
    minWidth: 0,
  },
  emptyAction: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptyActionText: {
    color: colors.primaryForeground,
    fontSize: typography.label,
    letterSpacing: 0,
  },
  emptyDescription: {
    color: colors.textMuted,
    textAlign: "center",
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    textAlign: "center",
  },
  listContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  nextOccurrence: {
    color: colors.textMuted,
    flexShrink: 0,
    fontSize: 13,
    lineHeight: 18,
  },
  recurrenceBadge: {
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 1,
    maxWidth: 96,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  recurrenceBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.88,
  },
  retryButton: {
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryButtonText: {
    color: colors.text,
    fontSize: typography.label,
    letterSpacing: 0,
  },
  screenContent: {
    flex: 1,
  },
});
