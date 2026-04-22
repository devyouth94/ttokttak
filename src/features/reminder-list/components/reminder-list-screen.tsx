import { useCallback, useMemo, useState } from "react";
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
import * as Select from "@rn-primitives/select";
import { Check, ChevronDown, ChevronRight, Plus } from "lucide-react-native";

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
  DEFAULT_REMINDER_LIST_SORT_MODE,
  type ReminderListEntry,
  type ReminderListSortMode,
} from "../reminder-list.helpers";

const sortOptions: {
  label: string;
  value: ReminderListSortMode;
}[] = [
  { label: "최근 생성순", value: "createdDesc" },
  { label: "제목순", value: "titleAsc" },
  { label: "다음 예정일 빠른순", value: "nextAsc" },
];

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

function SortControl({
  onChange,
  value,
}: {
  onChange: (value: ReminderListSortMode) => void;
  value: ReminderListSortMode;
}): React.JSX.Element {
  const selectedOption = getSortOption(value);

  return (
    <Select.Root
      onValueChange={(nextOption) => {
        const nextSortMode = parseSortMode(nextOption?.value);

        if (nextSortMode) {
          onChange(nextSortMode);
        }
      }}
      value={selectedOption}
    >
      <Select.Trigger asChild>
        <Pressable
          accessibilityHint="리마인더 목록 정렬 메뉴를 엽니다."
          accessibilityLabel={`정렬: ${selectedOption.label}`}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.sortTrigger,
            pressed ? styles.pressed : undefined,
          ]}
        >
          <Select.Value
            numberOfLines={1}
            placeholder="정렬 선택"
            style={styles.sortTriggerText}
          />
          <ChevronDown color={colors.textMuted} size={16} />
        </Pressable>
      </Select.Trigger>

      <Select.Portal>
        <Select.Overlay closeOnPress style={styles.sortMenuOverlay} />
        <Select.Content
          align="start"
          avoidCollisions
          insets={{
            bottom: spacing.lg,
            left: spacing.lg,
            right: spacing.lg,
            top: spacing.lg,
          }}
          side="bottom"
          sideOffset={6}
          style={styles.sortMenuContent}
        >
          {sortOptions.map((option) => (
            <Select.Item
              accessibilityHint={`${option.label}으로 정렬합니다.`}
              closeOnPress
              key={option.value}
              label={option.label}
              style={styles.sortMenuItem}
              value={option.value}
            >
              <Select.ItemText style={styles.sortMenuItemText} />
              <Select.ItemIndicator style={styles.sortMenuIndicator}>
                <Check color={colors.text} size={16} />
              </Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Portal>
    </Select.Root>
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
  const [sortMode, setSortMode] = useState<ReminderListSortMode>(
    DEFAULT_REMINDER_LIST_SORT_MODE
  );
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
        sortMode,
        timezone,
      }),
    [completionLogsQuery.data, items, sortMode, timezone]
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
          ListHeaderComponent={
            entries.length > 0 ? (
              <SortControl onChange={setSortMode} value={sortMode} />
            ) : null
          }
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

function getSortOption(value: ReminderListSortMode): {
  label: string;
  value: ReminderListSortMode;
} {
  return (
    sortOptions.find((option) => option.value === value) ?? sortOptions[0]!
  );
}

function parseSortMode(value: string | undefined): ReminderListSortMode | null {
  const option = sortOptions.find((candidate) => candidate.value === value);

  return option?.value ?? null;
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
  sortMenuContent: {
    backgroundColor: colors.surface,
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 180,
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
  sortMenuIndicator: {
    alignItems: "center",
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  sortMenuItem: {
    alignItems: "center",
    borderRadius: borderRadius.md,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sortMenuItemText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.label,
    lineHeight: 18,
  },
  sortMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sortTrigger: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: 210,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sortTriggerText: {
    color: colors.text,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 16,
    minWidth: 0,
  },
});
