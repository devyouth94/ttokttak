import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  type ListRenderItem,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { ko } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import { Bell, Check } from "lucide-react-native";

import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import { ScreenHeader } from "~/design-system/components/screen-header";
import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "~/design-system/tokens";
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

function formatInboxDateLabel(utcDateTime: string, timezone: string): string {
  return formatInTimeZone(utcDateTime, timezone, "M월 d일 EEE a h:mm", {
    locale: ko,
  });
}

function NotificationInboxRow({
  isSelected,
  isSelectionMode,
  item,
  onPress,
  timezone,
}: {
  isSelected: boolean;
  isSelectionMode: boolean;
  item: NotificationInboxItem;
  onPress: (item: NotificationInboxItem) => void;
  timezone: string;
}): React.JSX.Element {
  const isUnread = !item.readAt;

  return (
    <Pressable
      accessibilityHint={
        isSelectionMode
          ? "선택 상태를 변경합니다."
          : "알림과 연결된 리마인더 상세 화면으로 이동합니다."
      }
      accessibilityLabel={
        isSelectionMode
          ? `${item.title} 알림 ${isSelected ? "선택 해제" : "선택"}`
          : `${item.title} 알림 상세 보기`
      }
      accessibilityRole="button"
      accessibilityState={
        isSelectionMode
          ? {
              selected: isSelected,
            }
          : undefined
      }
      onPress={() => {
        onPress(item);
      }}
      style={({ pressed }) => [
        styles.inboxRow,
        isSelected ? styles.inboxRowSelected : undefined,
        pressed ? styles.pressed : undefined,
      ]}
    >
      {isSelectionMode ? (
        <View
          style={[
            styles.selectionIndicator,
            isSelected ? styles.selectionIndicatorSelected : undefined,
          ]}
        >
          {isSelected ? (
            <Check color={colors.primaryForeground} size={13} />
          ) : null}
        </View>
      ) : null}

      <View style={[styles.iconWrap, isUnread ? styles.iconWrapUnread : null]}>
        <Bell
          color={isUnread ? colors.primaryForeground : colors.textMuted}
          size={14}
        />
      </View>

      <View style={styles.rowCopy}>
        <View style={styles.rowTitleLine}>
          <AppText
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.rowTitle, isUnread ? styles.unreadTitle : null]}
            variant="label"
          >
            {item.title}
          </AppText>
          {isUnread ? <View style={styles.unreadDot} /> : null}
        </View>

        <AppText ellipsizeMode="tail" numberOfLines={2} style={styles.rowBody}>
          {item.body}
        </AppText>

        <AppText numberOfLines={1} style={styles.rowMeta}>
          {formatInboxDateLabel(item.deliveredAtUtc, timezone)}
        </AppText>
      </View>
    </Pressable>
  );
}

function EmptyState(): React.JSX.Element {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Bell color={colors.textMuted} size={20} />
      </View>
      <AppText style={styles.emptyTitle} variant="title">
        받은 알림이 없습니다.
      </AppText>
      <AppText style={styles.emptyDescription}>
        성공적으로 발송된 원격 푸시 알림이 이곳에 표시됩니다.
      </AppText>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <View style={styles.emptyState}>
      <AppText style={styles.emptyTitle} variant="title">
        알림을 불러오지 못했습니다.
      </AppText>
      <Pressable
        accessibilityHint="알림 목록 조회를 다시 시도합니다."
        accessibilityLabel="알림 다시 불러오기"
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

function HeaderTextButton({
  disabled,
  label,
  onPress,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerTextButton,
        disabled ? styles.headerTextButtonDisabled : undefined,
        pressed ? styles.pressed : undefined,
      ]}
    >
      <AppText
        numberOfLines={1}
        style={[
          styles.headerTextButtonText,
          disabled ? styles.headerTextButtonTextDisabled : undefined,
        ]}
        variant="label"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function SelectionToolbar({
  hasSelection,
  isDeleting,
  isMarkingRead,
  isSelectedAll,
  onDeleteSelected,
  onMarkSelectedRead,
  onToggleSelectAll,
}: {
  hasSelection: boolean;
  isDeleting: boolean;
  isMarkingRead: boolean;
  isSelectedAll: boolean;
  onDeleteSelected: () => void;
  onMarkSelectedRead: () => void;
  onToggleSelectAll: () => void;
}): React.JSX.Element {
  const isActionPending = isDeleting || isMarkingRead;

  return (
    <View style={styles.selectionToolbar}>
      <Pressable
        accessibilityLabel={isSelectedAll ? "전체 선택 해제" : "전체 선택"}
        accessibilityRole="button"
        accessibilityState={{
          checked: isSelectedAll,
        }}
        disabled={isActionPending}
        hitSlop={8}
        onPress={onToggleSelectAll}
        style={({ pressed }) => [
          styles.toolbarTextButton,
          isActionPending ? styles.toolbarTextButtonDisabled : undefined,
          pressed ? styles.pressed : undefined,
        ]}
      >
        <View
          style={[
            styles.toolbarCheck,
            isSelectedAll ? styles.toolbarCheckSelected : undefined,
          ]}
        >
          {isSelectedAll ? (
            <Check color={colors.primaryForeground} size={12} />
          ) : null}
        </View>
        <AppText
          style={[
            styles.toolbarTextButtonText,
            isActionPending ? styles.toolbarTextButtonTextDisabled : undefined,
          ]}
          variant="label"
        >
          {isSelectedAll ? "전체 해제" : "전체 선택"}
        </AppText>
      </Pressable>

      {hasSelection ? (
        <View style={styles.selectionActions}>
          <Pressable
            accessibilityLabel="선택 알림 읽음"
            accessibilityRole="button"
            disabled={isActionPending}
            hitSlop={8}
            onPress={onMarkSelectedRead}
            style={({ pressed }) => [
              styles.selectionActionButton,
              isActionPending
                ? styles.selectionActionButtonDisabled
                : undefined,
              pressed ? styles.pressed : undefined,
            ]}
          >
            <AppText style={styles.selectionActionText} variant="label">
              {isMarkingRead ? "처리 중" : "읽음"}
            </AppText>
          </Pressable>

          <Pressable
            accessibilityLabel="선택 알림 삭제"
            accessibilityRole="button"
            disabled={isActionPending}
            hitSlop={8}
            onPress={onDeleteSelected}
            style={({ pressed }) => [
              styles.selectionActionButton,
              styles.deleteActionButton,
              isActionPending
                ? styles.selectionActionButtonDisabled
                : undefined,
              pressed ? styles.pressed : undefined,
            ]}
          >
            <AppText
              style={[styles.selectionActionText, styles.deleteActionText]}
              variant="label"
            >
              {isDeleting ? "삭제 중" : "삭제"}
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
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

  useEffect(() => {
    const availableIds = new Set(inboxItems.map((item) => item.id));

    setSelectedItemIds((currentIds) => {
      const nextIds = new Set(
        Array.from(currentIds).filter((id) => availableIds.has(id))
      );

      return nextIds.size === currentIds.size ? currentIds : nextIds;
    });
  }, [inboxItems]);

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
      Alert.alert("삭제된 리마인더에요.");
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

  const headerRightSlot = (
    <HeaderTextButton
      disabled={inboxItems.length === 0 || isSelectionActionPending}
      label={isSelectionMode ? "취소" : "선택"}
      onPress={isSelectionMode ? handleCancelSelection : handleStartSelection}
    />
  );

  const renderItem: ListRenderItem<NotificationInboxItem> = ({ item }) => (
    <NotificationInboxRow
      isSelected={selectedItemIds.has(item.id)}
      isSelectionMode={isSelectionMode}
      item={item}
      onPress={handleInboxItemPress}
      timezone={timezone}
    />
  );

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <ScreenHeader
        onBack={() => {
          router.back();
        }}
        rightSlot={headerRightSlot}
        title="알림"
      />

      {isSelectionMode && inboxItems.length > 0 ? (
        <SelectionToolbar
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
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : inboxItemsQuery.error ? (
        <ErrorState
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
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              onRefresh={() => {
                void inboxItemsQuery.refetch();
              }}
              refreshing={inboxItemsQuery.isRefetching}
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

function keyExtractor(item: NotificationInboxItem): string {
  return item.id;
}

const styles = StyleSheet.create({
  deleteActionButton: {
    borderColor: colors.statusOverdueSoft,
  },
  deleteActionText: {
    color: colors.error,
  },
  emptyDescription: {
    color: colors.textMuted,
    textAlign: "center",
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceHigh,
    borderRadius: borderRadius.pill,
    height: 44,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 44,
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
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.surfaceHigh,
    borderRadius: borderRadius.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  iconWrapUnread: {
    backgroundColor: colors.primary,
  },
  inboxRow: {
    alignItems: "center",
    borderBottomColor: colors.outlineSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  inboxRowSelected: {
    backgroundColor: colors.surfaceLow,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  headerTextButton: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  headerTextButtonDisabled: {
    opacity: 0.5,
  },
  headerTextButtonText: {
    color: colors.primary,
    fontSize: typography.label,
    letterSpacing: 0,
  },
  headerTextButtonTextDisabled: {
    color: colors.textSoft,
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
  rowBody: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  rowCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  rowMeta: {
    color: colors.textSoft,
    fontSize: 11,
    lineHeight: 16,
  },
  rowTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    minWidth: 0,
  },
  rowTitleLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 0,
  },
  screenContent: {
    flex: 1,
  },
  selectionActionButton: {
    alignItems: "center",
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 58,
    paddingHorizontal: spacing.md,
  },
  selectionActionButtonDisabled: {
    opacity: 0.5,
  },
  selectionActionText: {
    color: colors.text,
    fontSize: typography.label,
    letterSpacing: 0,
  },
  selectionActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  selectionIndicator: {
    alignItems: "center",
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  selectionIndicatorSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectionListContent: {
    paddingTop: 0,
  },
  selectionToolbar: {
    alignItems: "center",
    borderBottomColor: colors.outlineSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  toolbarTextButton: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 34,
  },
  toolbarTextButtonDisabled: {
    opacity: 0.5,
  },
  toolbarTextButtonText: {
    color: colors.primary,
    fontSize: typography.label,
    letterSpacing: 0,
  },
  toolbarTextButtonTextDisabled: {
    color: colors.textSoft,
  },
  toolbarCheck: {
    alignItems: "center",
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  toolbarCheckSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unreadDot: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    height: 6,
    width: 6,
  },
  unreadTitle: {
    fontWeight: "700",
  },
});
