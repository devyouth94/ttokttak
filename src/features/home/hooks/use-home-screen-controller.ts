import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { format, startOfDay } from "date-fns";

import { useNotificationBootstrap } from "~/features/notifications/notification-bootstrap";
import { useNotificationInboxItemsQuery } from "~/features/notifications/use-notification-inbox-items-query";
import type {
  CompletionAction,
  CompletionLog,
  RecurringItem,
} from "~/features/recurring/domain/types";
import { useCompletionLogsQuery } from "~/features/recurring/hooks/use-completion-logs-query";
import { useRecurringFeedContext } from "~/features/recurring/hooks/use-recurring-feed-context";
import { useRecurringItemsQuery } from "~/features/recurring/hooks/use-recurring-items-query";
import { useSession } from "~/features/session/session-provider";
import { getErrorMessage } from "~/lib/errors/get-error-message";

import { useHomeOccurrenceActions } from "./use-home-occurrence-actions";
import {
  buildHomeFeedSections,
  getProfileName,
  type HomeFeedCard,
  type HomeFeedSection,
} from "../components/home-screen.helpers";

let hasShownNotificationPermissionPrompt = false;
const HOME_NOTIFICATION_INBOX_LIMIT = 50;
const EMPTY_COMPLETION_LOGS: CompletionLog[] = [];
const EMPTY_ITEMS: RecurringItem[] = [];

type HomeScreenController = {
  errorMessage: string | null;
  feedSections: HomeFeedSection[];
  hasUnreadNotification: boolean;
  isContentReady: boolean;
  isLoading: boolean;
  onOccurrenceAction: (
    card: HomeFeedCard,
    action: CompletionAction
  ) => Promise<void>;
  onRetryFeed: () => Promise<void>;
  onSelectDate: (dateId: string) => void;
  processingOccurrenceIds: string[];
  profileName: string;
  selectedDateId: string;
  selectedDateIsToday: boolean;
};

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

function showNotificationPermissionPrompt(
  requestPermission: () => Promise<unknown>
): void {
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
}

export function useHomeScreenController(): HomeScreenController {
  const { profile } = useSession();
  const { permission, requestPermission, syncAfterMutation } =
    useNotificationBootstrap();
  const { isReady, timezone, userId } = useRecurringFeedContext();
  const isFocused = useIsFocused();

  const [selectedDateId, setSelectedDateId] = useState(() =>
    format(startOfDay(new Date()), "yyyy-MM-dd")
  );
  const hasFocusedOnceRef = useRef(false);

  const itemsQuery = useRecurringItemsQuery({
    enabled: isReady,
    timezone,
    userId,
  });
  const items = itemsQuery.data ?? EMPTY_ITEMS;

  const completionLogsQuery = useCompletionLogsQuery({
    enabled: isReady,
    itemIds: items.map((item) => item.id),
    userId,
  });
  const completionLogs = completionLogsQuery.data ?? EMPTY_COMPLETION_LOGS;

  const inboxItemsQuery = useNotificationInboxItemsQuery({
    enabled: isReady,
    limit: HOME_NOTIFICATION_INBOX_LIMIT,
  });

  const refetchItems = itemsQuery.refetch;
  const refetchCompletionLogs = completionLogsQuery.refetch;

  const refetchFeed = useCallback(async (): Promise<void> => {
    await Promise.all([refetchItems(), refetchCompletionLogs()]);
  }, [refetchCompletionLogs, refetchItems]);

  const {
    actionErrorMessage,
    clearActionError,
    handleOccurrenceAction,
    processingOccurrenceIds,
  } = useHomeOccurrenceActions({
    completionLogs,
    refetchFeed,
    syncAfterMutation,
    timezone,
    userId,
  });

  const isLoading =
    itemsQuery.isPending || (items.length > 0 && completionLogsQuery.isPending);
  const errorMessage =
    actionErrorMessage ??
    getHomeFeedErrorMessage(itemsQuery.error, completionLogsQuery.error);
  const now = new Date();
  const feedSections = buildHomeFeedSections({
    completionLogs,
    items,
    now,
    selectedDateId,
    timezone,
  }).map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !processingOccurrenceIds.includes(item.id)
    ),
  }));

  const handleRetryFeed = useCallback(async (): Promise<void> => {
    clearActionError();
    await refetchFeed();
  }, [clearActionError, refetchFeed]);

  useEffect(() => {
    if (!isFocused || !isReady || !userId) {
      return;
    }

    if (!hasFocusedOnceRef.current) {
      hasFocusedOnceRef.current = true;
      return;
    }

    void refetchFeed();
  }, [isFocused, isReady, refetchFeed, userId]);

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
    showNotificationPermissionPrompt(requestPermission);
  }, [
    isFocused,
    isReady,
    permission.canRequest,
    permission.status,
    requestPermission,
    userId,
  ]);

  return {
    errorMessage,
    feedSections,
    hasUnreadNotification: Boolean(
      inboxItemsQuery.data?.some((item) => !item.readAt)
    ),
    isContentReady: isReady && Boolean(userId),
    isLoading,
    onOccurrenceAction: handleOccurrenceAction,
    onRetryFeed: handleRetryFeed,
    onSelectDate: setSelectedDateId,
    processingOccurrenceIds,
    profileName: getProfileName(profile),
    selectedDateId,
    selectedDateIsToday:
      selectedDateId === format(startOfDay(now), "yyyy-MM-dd"),
  };
}
