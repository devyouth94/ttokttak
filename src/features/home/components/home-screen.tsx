import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { format, startOfDay } from "date-fns";

import { AppScreen } from "~/design-system/components/app-screen";
import { AppStatePlaceholder } from "~/design-system/components/app-state";
import { color } from "~/design-system/tokens";
import { MAIN_BOTTOM_NAV_RESERVED_HEIGHT } from "~/features/navigation/constants/main-bottom-nav-layout";
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

import { HomeFeedErrorCard } from "./home-feed-error-card";
import { HomeFeedSectionList } from "./home-feed-section-list";
import {
  buildHomeFeedSections,
  getOverdueOccurrencesToResolve,
  getProfileName,
  type HomeFeedCard,
} from "./home-screen.helpers";
import { HomeTopPanel } from "./home-top-panel";

let hasShownNotificationPermissionPrompt = false;
const HOME_NOTIFICATION_INBOX_LIMIT = 50;

function getHomeFeedErrorMessage(
  itemsError: unknown,
  completionLogsError: unknown
): string | null {
  if (itemsError) {
    return getErrorMessage(itemsError);
  }

  if (completionLogsError) {
    return getErrorMessage(completionLogsError);
  }

  return null;
}

export function HomeScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
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
  const [screenHeight, setScreenHeight] = useState(0);
  const [topPanelHeight, setTopPanelHeight] = useState(0);
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
    getHomeFeedErrorMessage(itemsQuery.error, completionLogsQuery.error);
  const todayId = format(startOfDay(new Date()), "yyyy-MM-dd");
  const selectedDateIsToday = selectedDateId === todayId;
  const bottomNavReservedHeight =
    MAIN_BOTTOM_NAV_RESERVED_HEIGHT + insets.bottom;
  const feedViewportHeight = Math.floor(
    Math.max(screenHeight - topPanelHeight - bottomNavReservedHeight, 0)
  );
  const feedSections = buildHomeFeedSections({
    completionLogs,
    items,
    now: new Date(),
    selectedDateId,
    timezone,
  }).map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !processingOccurrenceIds.includes(item.id)
    ),
  }));

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

  const handleTopPanelHeightChange = (height: number): void => {
    setTopPanelHeight((current) => (current === height ? current : height));
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
      <View
        onLayout={({ nativeEvent }) => {
          setScreenHeight((current) =>
            current === nativeEvent.layout.height
              ? current
              : nativeEvent.layout.height
          );
        }}
        style={styles.screenRoot}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.screenScroll}
        >
          <HomeTopPanel
            hasUnreadNotification={hasUnreadNotification}
            onHeightChange={handleTopPanelHeightChange}
            onSelectDate={setSelectedDateId}
            profileName={profileName}
            selectedDateId={selectedDateId}
          />

          {errorMessage ? (
            <HomeFeedErrorCard message={errorMessage} onRetry={reloadFeed} />
          ) : null}

          <HomeFeedSectionList
            bottomNavReservedHeight={bottomNavReservedHeight}
            feedSections={feedSections}
            feedViewportHeight={feedViewportHeight}
            isLoading={isLoading}
            onAction={handleOccurrenceAction}
            processingOccurrenceIds={processingOccurrenceIds}
            selectedDateIsToday={selectedDateIsToday}
          />
        </ScrollView>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    position: "relative",
  },
  screenRoot: {
    backgroundColor: color.white,
    flex: 1,
  },
  screenScroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
