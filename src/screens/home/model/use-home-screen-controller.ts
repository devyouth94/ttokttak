import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { formatInTimeZone } from "date-fns-tz";

import { useAppLanguage } from "~/i18n/provider";
import { useNotifications } from "~/notifications/provider";
import { useNow } from "~/schedule/now";
import type { OccurrenceAction } from "~/schedule/rules/occurrence";
import { useSession } from "~/session/provider";

import {
  buildHomeFeedSections,
  getProfileName,
  type HomeFeedCard,
  type HomeFeedSection,
} from "./home-feed-sections";
import { useHomeOccurrenceActions } from "./use-home-occurrence-actions";
import { useHomeQuery } from "../query";

let hasShownNotificationPermissionPrompt = false;

type NotificationPermissionPromptCopy = {
  cancelText: string;
  errorTitle: string;
  message: string;
  requestText: string;
  title: string;
};

type HomeScreenController = {
  errorMessage: string | null;
  feedSections: HomeFeedSection[];
  isContentReady: boolean;
  isLoading: boolean;
  onOccurrenceAction: (
    card: HomeFeedCard,
    action: OccurrenceAction
  ) => Promise<void>;
  onRetryFeed: () => Promise<void>;
  onSelectDate: (dateId: string) => void;
  processingOccurrenceIds: string[];
  profileName: string;
  selectedDateId: string;
  selectedDateIsToday: boolean;
};

function showNotificationPermissionPrompt(
  requestPermission: () => Promise<unknown>,
  copy: NotificationPermissionPromptCopy
): void {
  Alert.alert(copy.title, copy.message, [
    {
      style: "cancel",
      text: copy.cancelText,
    },
    {
      onPress: () => {
        void requestPermission().catch((error) => {
          Alert.alert(
            copy.errorTitle,
            error instanceof Error ? error.message : String(error)
          );
        });
      },
      text: copy.requestText,
    },
  ]);
}

export function useHomeScreenController(): HomeScreenController {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const { profile } = useSession();
  const { permission, requestPermission, syncNotifications } =
    useNotifications();
  const isFocused = useIsFocused();
  const now = useNow();
  const initialTimezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [selectedDateId, setSelectedDateId] = useState(() =>
    formatInTimeZone(new Date(), initialTimezone, "yyyy-MM-dd")
  );
  const hasFocusedOnceRef = useRef(false);
  const previousTimezoneRef = useRef(initialTimezone);
  const projectionQuery = useHomeQuery({ now, selectedDateId });
  const {
    completionLogs,
    isReady,
    overdueEntries,
    refetch: refetchProjection,
    selectedDateEntries,
    timezone,
    upcomingEntries,
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
    syncNotifications,
    timezone,
    userId,
  });

  const isLoading = projectionQuery.isLoading;
  const errorMessage =
    actionErrorMessage ??
    (projectionQuery.error ? t("home.feed.errorDescription") : null);
  const feedSections = buildHomeFeedSections({
    language,
    now,
    overdueEntries,
    selectedDateId,
    selectedDateEntries,
    timezone,
    upcomingEntries,
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
    showNotificationPermissionPrompt(requestPermission, {
      cancelText: t("home.notificationPermission.cancel"),
      errorTitle: t("home.notificationPermission.errorTitle"),
      message: t("home.notificationPermission.message"),
      requestText: t("home.notificationPermission.request"),
      title: t("home.notificationPermission.title"),
    });
  }, [
    isFocused,
    isReady,
    permission.canRequest,
    permission.status,
    requestPermission,
    t,
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
