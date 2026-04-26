import { useCallback, useMemo, useState } from "react";
import {
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

import { AppScreen } from "~/design-system/components/app-screen";
import {
  AppStatePlaceholder,
  AppStateView,
} from "~/design-system/components/app-state";
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
    <Pressable
      accessibilityHint="리마인더 상세 화면으로 이동해요."
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
        styles.cardRow,
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
          accessibilityHint="리마인더 목록 정렬 메뉴를 열어요."
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
              accessibilityHint={`${option.label}으로 정렬해요.`}
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
    <AppStateView
      action={{
        accessibilityHint: "리마인더 만들기 화면으로 이동해요.",
        accessibilityLabel: "리마인더 만들기",
        icon: <Plus color={colors.text} size={16} />,
        label: "리마인더 만들기",
        onPress: () => {
          router.push({
            params: { returnTo: "/schedule" },
            pathname: "/items/new",
          });
        },
      }}
      description="리마인더를 추가하면 이곳에서 한눈에 볼 수 있어요."
      style={styles.stateView}
      title="등록된 리마인더가 없어요"
    />
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <AppStateView
      action={{
        accessibilityHint: "리마인더 목록 조회를 다시 시도해요.",
        accessibilityLabel: "리마인더 다시 불러오기",
        label: "다시 시도",
        onPress: onRetry,
      }}
      style={styles.stateView}
      title="리마인더를 불러오지 못했어요"
    />
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
        <AppStatePlaceholder rowCount={4} showHeader />
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
  cardCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 0,
  },
  cardRow: {
    alignItems: "center",
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
    color: colors.text,
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    minWidth: 0,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  listContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  nextOccurrence: {
    color: colors.textMuted,
    flexShrink: 0,
    fontSize: 12,
    lineHeight: 17,
  },
  recurrenceBadge: {
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 1,
    maxWidth: 96,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
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
  stateView: {
    minHeight: 240,
  },
});
