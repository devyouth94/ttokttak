import { useCallback, useMemo, useState } from "react";
import {
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreen } from "~/design-system/components/app-screen";
import { ScreenHeader } from "~/design-system/components/screen-header";
import { useCollapsibleHeader } from "~/design-system/hooks/use-collapsible-header";
import { colors, spacing } from "~/design-system/tokens";
import { MAIN_BOTTOM_NAV_RESERVED_HEIGHT } from "~/features/navigation/constants/main-bottom-nav-layout";
import { useCompletionLogsQuery } from "~/features/recurring/hooks/use-completion-logs-query";
import { useRecurringFeedContext } from "~/features/recurring/hooks/use-recurring-feed-context";
import { useRecurringItemsQuery } from "~/features/recurring/hooks/use-recurring-items-query";

import { ReminderListItemRow } from "./reminder-list-item-row";
import { ReminderListLoadingPlaceholder } from "./reminder-list-loading-placeholder";
import { ReminderListSortControl } from "./reminder-list-sort-control";
import {
  ReminderListEmptyState,
  ReminderListErrorState,
} from "./reminder-list-state-views";
import { useReminderListNow } from "../hooks/use-reminder-list-now";
import {
  buildReminderListEntries,
  DEFAULT_REMINDER_LIST_SORT_MODE,
  type ReminderListEntry,
  type ReminderListSortMode,
} from "../reminder-list.helpers";

export function ReminderListScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const now = useReminderListNow();
  const {
    headerAnimatedStyle,
    headerHeight,
    onHeaderHeightChange,
    onScroll,
    scrollEventThrottle,
  } = useCollapsibleHeader({ hiddenOffset: insets.top });
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
        now,
        sortMode,
        timezone,
      }),
    [completionLogsQuery.data, items, now, sortMode, timezone]
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

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <Animated.View style={[styles.headerLayer, headerAnimatedStyle]}>
        <ScreenHeader onHeightChange={onHeaderHeightChange} title="일정 목록" />
      </Animated.View>

      {isInitialLoading ? (
        <View
          style={[
            styles.staticContent,
            styles.listContent,
            { paddingTop: headerHeight },
          ]}
        >
          <ReminderListLoadingPlaceholder />
        </View>
      ) : error ? (
        <View style={[styles.staticContent, { paddingTop: headerHeight }]}>
          <ReminderListErrorState onRetry={handleRetry} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: headerHeight },
            {
              paddingBottom: MAIN_BOTTOM_NAV_RESERVED_HEIGHT + insets.bottom,
            },
            entries.length === 0 ? styles.emptyListContent : undefined,
          ]}
          data={entries}
          keyExtractor={keyExtractor}
          ListHeaderComponent={
            entries.length > 0 ? (
              <View style={styles.sortControlSlot}>
                <ReminderListSortControl
                  onChange={setSortMode}
                  value={sortMode}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={<ReminderListEmptyState />}
          refreshControl={
            <RefreshControl
              onRefresh={handleRefresh}
              refreshing={isRefreshing}
              tintColor={colors.primary}
            />
          }
          renderItem={({ index, item }) => (
            <ReminderListItemRow
              entry={item}
              isLast={index === entries.length - 1}
            />
          )}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
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
  emptyListContent: {
    flexGrow: 1,
  },
  headerLayer: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  screenContent: {
    flex: 1,
  },
  sortControlSlot: {
    marginBottom: spacing.md,
  },
  staticContent: {
    flex: 1,
  },
});
