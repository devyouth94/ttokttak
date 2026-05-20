import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { formatInTimeZone } from "date-fns-tz";

import { useRecurringFeedContext } from "~/application/recurring";
import { useSession } from "~/application/session";
import type { CompletionAction } from "~/entities/schedule";
import { useNotifications } from "~/features/notifications";
import { useOccurrenceProjectionQuery } from "~/features/recurring/hooks/use-occurrence-projection-query";
import { getErrorMessage } from "~/shared/lib/errors/get-error-message";

import {
  buildHomeFeedSections,
  getProfileName,
  type HomeFeedCard,
  type HomeFeedSection,
} from "./home-feed-sections";
import { useHomeOccurrenceActions } from "./use-home-occurrence-actions";

let hasShownNotificationPermissionPrompt = false;

type HomeScreenController = {
  errorMessage: string | null;
  feedSections: HomeFeedSection[];
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

function showNotificationPermissionPrompt(
  requestPermission: () => Promise<unknown>
): void {
  Alert.alert(
    "알림을 켤까요?",
    "정해둔 시간에 알려드리려면 알림 권한이 필요해요.",
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
    useNotifications();
  const recurringFeedContext = useRecurringFeedContext();
  const isFocused = useIsFocused();

  const [selectedDateId, setSelectedDateId] = useState(() =>
    formatInTimeZone(new Date(), recurringFeedContext.timezone, "yyyy-MM-dd")
  );
  const hasFocusedOnceRef = useRef(false);
  const previousTimezoneRef = useRef(recurringFeedContext.timezone);
  const now = new Date();
  const projectionQuery = useOccurrenceProjectionQuery({
    context: recurringFeedContext,
    purpose: {
      now,
      selectedDateId,
      type: "homeFeed",
    },
  });
  const {
    completionLogs,
    isReady,
    items,
    projectionRequirement,
    refetch: refetchProjection,
    timezone,
    userId,
  } = projectionQuery;

  const refetchFeed = useCallback(async (): Promise<void> => {
    await refetchProjection();
  }, [refetchProjection]);

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

  const isLoading = projectionQuery.isLoading;
  const errorMessage =
    actionErrorMessage ??
    (projectionQuery.error ? getErrorMessage(projectionQuery.error) : null);
  const feedSections = buildHomeFeedSections({
    completionLogs,
    items,
    now,
    projection: projectionRequirement.projection,
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
    const previousTimezone = previousTimezoneRef.current;

    if (previousTimezone === timezone) {
      return;
    }

    const currentNow = new Date();
    const previousTodayLocalDate = formatInTimeZone(
      currentNow,
      previousTimezone,
      "yyyy-MM-dd"
    );
    const nextTodayLocalDate = formatInTimeZone(
      currentNow,
      timezone,
      "yyyy-MM-dd"
    );

    previousTimezoneRef.current = timezone;
    setSelectedDateId((currentSelectedDateId) =>
      currentSelectedDateId === previousTodayLocalDate
        ? nextTodayLocalDate
        : currentSelectedDateId
    );
  }, [timezone]);

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
    isContentReady: isReady && Boolean(userId),
    isLoading,
    onOccurrenceAction: handleOccurrenceAction,
    onRetryFeed: handleRetryFeed,
    onSelectDate: setSelectedDateId,
    processingOccurrenceIds,
    profileName: getProfileName(profile),
    selectedDateId,
    selectedDateIsToday:
      selectedDateId === formatInTimeZone(now, timezone, "yyyy-MM-dd"),
  };
}
