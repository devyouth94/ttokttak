import { useCallback, useMemo, useState } from "react";
import {
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { RecurringItemSummaryRow } from "~/entities/schedule/ui";
import { MAIN_BOTTOM_NAV_RESERVED_HEIGHT } from "~/features/navigation/constants/main-bottom-nav-layout";
import { useOccurrenceProjectionQuery } from "~/features/recurring/hooks/use-occurrence-projection-query";
import { AppScreen } from "~/shared/ui/app-screen";
import { ScreenHeader } from "~/shared/ui/screen-header";
import { colors, spacing } from "~/shared/ui/tokens";
import { useCollapsibleHeader } from "~/shared/ui/use-collapsible-header";

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
  const projectionQuery = useOccurrenceProjectionQuery({
    purpose: {
      now,
      type: "reminderList",
    },
  });
  const items = projectionQuery.items;
  const entries = useMemo(
    () =>
      buildReminderListEntries({
        completionLogs: projectionQuery.completionLogs,
        items,
        now,
        sortMode,
        timezone: projectionQuery.timezone,
      }),
    [
      projectionQuery.completionLogs,
      items,
      now,
      sortMode,
      projectionQuery.timezone,
    ]
  );
  const isInitialLoading = projectionQuery.isLoading;
  const error = projectionQuery.error;
  const isRefreshing = projectionQuery.isRefreshing;
  const refetchProjection = projectionQuery.refetch;

  const handleRetry = useCallback(() => {
    void refetchProjection();
  }, [refetchProjection]);

  const handleRefresh = useCallback(() => {
    void refetchProjection();
  }, [refetchProjection]);

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
            <RecurringItemSummaryRow
              accessibilityHint="일정 상세 화면으로 이동해요."
              colorKey={item.colorKey}
              isLast={index === entries.length - 1}
              metaLine={[
                item.nextOccurrenceTimeLabel,
                item.recurrenceLabel,
              ].join(" · ")}
              onPress={() => {
                router.push({
                  params: {
                    itemId: item.id,
                    returnTo: "/schedule",
                    ...(item.nextScheduledAtUtc
                      ? { scheduledAtUtc: item.nextScheduledAtUtc }
                      : {}),
                  },
                  pathname: "/items/[itemId]",
                });
              }}
              title={item.title}
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
