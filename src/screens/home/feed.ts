import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIsFocused } from "@react-navigation/native";
import { formatInTimeZone } from "date-fns-tz";

import { useDeviceSync } from "~/device-sync";
import { useAppLanguage } from "~/i18n/provider";
import { createHomeSections } from "~/schedule/home-feed";
import { useNow } from "~/schedule/now";
import { useSchedules } from "~/schedule/query";
import { useSession } from "~/session/provider";

import { useHomeActions } from "./action";

/**
 * 홈의 선택 날짜, 조회, 재진입 재조회와 occurrence 처리 상태를 제공한다.
 * status는 화면 준비 전, 피드 조회 중, 표시 가능 상태를 구분한다.
 * 라우트는 시간대 변경에 따른 날짜 보정이나 조회 범위를 알 필요가 없다.
 */
export function useHomeFeed() {
  const { t } = useTranslation();
  const { language } = useAppLanguage();

  const { profile } = useSession();
  const { syncDeviceOutputs } = useDeviceSync();

  const isFocused = useIsFocused();
  const hasFocusedOnceRef = useRef(false);

  const now = useNow();
  const initialTimezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [selectedDateId, setSelectedDateId] = useState(() =>
    formatInTimeZone(new Date(), initialTimezone, "yyyy-MM-dd")
  );
  const previousTimezoneRef = useRef(initialTimezone);

  const query = useSchedules();
  const refetch = query.refetch;
  const status = getStatus(query);

  const actions = useHomeActions({
    completionLogs: query.logs,
    syncDeviceOutputs,
    timezone: query.timezone,
    userId: query.userId,
  });

  const sections = createHomeSections({
    language,
    logs: query.logs,
    now,
    schedules: query.items,
    selectedDateId,
    t,
    timezone: query.timezone,
  }).map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !actions.processingIds.includes(item.id)
    ),
  }));

  // 사용자가 오늘을 보고 있을 때만 시간대 변경에 맞춰 선택 날짜를 옮긴다.
  useEffect(() => {
    const previousTimezone = previousTimezoneRef.current;

    if (previousTimezone === query.timezone) {
      return;
    }

    const currentNow = new Date();
    const previousToday = formatInTimeZone(
      currentNow,
      previousTimezone,
      "yyyy-MM-dd"
    );
    const nextToday = formatInTimeZone(
      currentNow,
      query.timezone,
      "yyyy-MM-dd"
    );

    previousTimezoneRef.current = query.timezone;
    setSelectedDateId((selectedDate) =>
      selectedDate === previousToday ? nextToday : selectedDate
    );
  }, [query.timezone]);

  // 최초 조회는 query가 수행하므로, 홈으로 다시 돌아왔을 때만 새로 읽는다.
  useEffect(() => {
    if (!isFocused || !query.isReady || !query.userId) {
      return;
    }

    if (!hasFocusedOnceRef.current) {
      hasFocusedOnceRef.current = true;
      return;
    }

    void refetch();
  }, [isFocused, query.isReady, query.userId, refetch]);

  const retry = async (): Promise<void> => {
    actions.clearError();
    await refetch();
  };

  return {
    errorMessage:
      actions.errorMessage ??
      (query.error ? t("home.feed.errorDescription") : null),
    isToday:
      selectedDateId === formatInTimeZone(now, query.timezone, "yyyy-MM-dd"),
    retry,
    runAction: actions.runAction,
    sections,
    selectDate: setSelectedDateId,
    selectedDateId,
    status,
  } as const;
}

function getStatus(query: {
  isLoading: boolean;
  isReady: boolean;
  userId: string | null;
}): "starting" | "loading" | "ready" {
  if (!query.isReady || !query.userId) {
    return "starting";
  }

  return query.isLoading ? "loading" : "ready";
}
