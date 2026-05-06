import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet } from "react-native";
import { router } from "expo-router";

import { AppScreen } from "~/design-system/components/app-screen";
import { colors, spacing } from "~/design-system/tokens";
import { NotificationInboxHeader } from "~/features/notifications/components/notification-inbox-header";
import { NotificationInboxPlaceholder } from "~/features/notifications/components/notification-inbox-placeholder";
import { NotificationInboxRow } from "~/features/notifications/components/notification-inbox-row";
import { NotificationInboxSelectionToolbar } from "~/features/notifications/components/notification-inbox-selection-toolbar";
import {
  NotificationInboxEmptyState,
  NotificationInboxErrorState,
} from "~/features/notifications/components/notification-inbox-state-views";
import type { NotificationInboxItem } from "~/features/notifications/notification-inbox-repository";
import { navigateFromNotificationInboxItem } from "~/features/notifications/notification-response-navigation";
import {
  useHideNotificationInboxItemsMutation,
  useMarkNotificationInboxItemReadMutation,
  useMarkNotificationInboxItemsReadMutation,
  useNotificationInboxItemsQuery,
} from "~/features/notifications/use-notification-inbox-items-query";
import { useSession } from "~/features/session/session-provider";

const INBOX_ITEM_LIMIT = 50;
const EMPTY_INBOX_ITEMS: NotificationInboxItem[] = [];

function getDeviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export default function HomeNotificationsPage(): React.JSX.Element {
  const { isLoading: isSessionLoading, profile } = useSession();
  const timezone = profile?.timezone ?? getDeviceTimeZone();
  const inboxItemsQuery = useNotificationInboxItemsQuery({
    limit: INBOX_ITEM_LIMIT,
  });
  const markReadMutation = useMarkNotificationInboxItemReadMutation();
  const markSelectedReadMutation = useMarkNotificationInboxItemsReadMutation();
  const hideSelectedMutation = useHideNotificationInboxItemsMutation();
  const inboxItems = inboxItemsQuery.data ?? EMPTY_INBOX_ITEMS;
  const isInitialLoading = isSessionLoading || inboxItemsQuery.isLoading;
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    () => new Set()
  );
  const selectedIds = useMemo(
    () => Array.from(selectedItemIds),
    [selectedItemIds]
  );
  const isSelectedAll =
    inboxItems.length > 0 && selectedItemIds.size === inboxItems.length;
  const isSelectionActionPending =
    markSelectedReadMutation.isPending || hideSelectedMutation.isPending;

  const handleInboxItemPress = (item: NotificationInboxItem): void => {
    if (isSelectionMode) {
      setSelectedItemIds((currentIds) => {
        const nextIds = new Set(currentIds);

        if (nextIds.has(item.id)) {
          nextIds.delete(item.id);
        } else {
          nextIds.add(item.id);
        }

        return nextIds;
      });
      return;
    }

    if (!item.readAt) {
      markReadMutation.mutate({
        id: item.id,
        readAt: new Date().toISOString(),
      });
    }

    if (item.isItemArchived) {
      Alert.alert("삭제된 일정이에요.");
      return;
    }

    navigateFromNotificationInboxItem(item);
  };

  const handleStartSelection = (): void => {
    setIsSelectionMode(true);
  };

  const handleCancelSelection = (): void => {
    setIsSelectionMode(false);
    setSelectedItemIds(new Set());
  };

  const handleToggleSelectAll = (): void => {
    if (isSelectionActionPending) {
      return;
    }

    if (isSelectedAll) {
      setSelectedItemIds(new Set());
      return;
    }

    setSelectedItemIds(new Set(inboxItems.map((item) => item.id)));
  };

  const handleMarkSelectedRead = (): void => {
    if (selectedIds.length === 0 || isSelectionActionPending) {
      return;
    }

    markSelectedReadMutation.mutate(
      {
        ids: selectedIds,
        readAt: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          handleCancelSelection();
        },
      }
    );
  };

  const handleDeleteSelected = (): void => {
    if (selectedIds.length === 0 || isSelectionActionPending) {
      return;
    }

    Alert.alert(
      "알림 삭제",
      `선택한 알림 ${selectedIds.length}개를 알림함에서 삭제할까요?`,
      [
        {
          style: "cancel",
          text: "취소",
        },
        {
          onPress: () => {
            hideSelectedMutation.mutate(
              {
                hiddenAt: new Date().toISOString(),
                ids: selectedIds,
              },
              {
                onSuccess: () => {
                  handleCancelSelection();
                },
              }
            );
          },
          style: "destructive",
          text: "삭제",
        },
      ]
    );
  };

  const isHeaderActionDisabled = isSelectionMode
    ? isSelectionActionPending
    : inboxItems.length === 0 || isSelectionActionPending;

  useEffect(() => {
    const availableIds = new Set(inboxItems.map((item) => item.id));

    setSelectedItemIds((currentIds) => {
      const nextIds = new Set(
        Array.from(currentIds).filter((id) => availableIds.has(id))
      );

      return nextIds.size === currentIds.size ? currentIds : nextIds;
    });
  }, [inboxItems]);

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <NotificationInboxHeader
        disabled={isHeaderActionDisabled}
        isSelectionMode={isSelectionMode}
        onBack={() => {
          router.back();
        }}
        onToggleSelectionMode={
          isSelectionMode ? handleCancelSelection : handleStartSelection
        }
      />

      {isSelectionMode && inboxItems.length > 0 ? (
        <NotificationInboxSelectionToolbar
          hasSelection={selectedIds.length > 0}
          isDeleting={hideSelectedMutation.isPending}
          isMarkingRead={markSelectedReadMutation.isPending}
          isSelectedAll={isSelectedAll}
          onDeleteSelected={handleDeleteSelected}
          onMarkSelectedRead={handleMarkSelectedRead}
          onToggleSelectAll={handleToggleSelectAll}
        />
      ) : null}

      {isInitialLoading ? (
        <NotificationInboxPlaceholder />
      ) : inboxItemsQuery.error ? (
        <NotificationInboxErrorState
          onRetry={() => {
            void inboxItemsQuery.refetch();
          }}
        />
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            isSelectionMode ? styles.selectionListContent : undefined,
            inboxItems.length === 0 ? styles.emptyListContent : undefined,
          ]}
          data={inboxItems}
          keyExtractor={keyExtractor}
          ListEmptyComponent={<NotificationInboxEmptyState />}
          refreshControl={
            <RefreshControl
              onRefresh={() => {
                void inboxItemsQuery.refetch();
              }}
              refreshing={inboxItemsQuery.isRefetching}
              tintColor={colors.text}
            />
          }
          renderItem={({ item }) => (
            <NotificationInboxRow
              isSelected={selectedItemIds.has(item.id)}
              isSelectionMode={isSelectionMode}
              item={item}
              onPress={handleInboxItemPress}
              timezone={timezone}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </AppScreen>
  );
}

function keyExtractor(item: NotificationInboxItem): string {
  return item.id;
}

const styles = StyleSheet.create({
  emptyListContent: {
    flexGrow: 1,
  },
  listContent: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  screenContent: {
    flex: 1,
  },
  selectionListContent: {
    paddingTop: 0,
  },
});
