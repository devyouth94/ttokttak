import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Calendar, type DateData, LocaleConfig } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import { AppScreen } from "~/design-system/components/app-screen";
import {
  AppEmptyStateView,
  AppRetryStatePanel,
} from "~/design-system/components/app-state";
import { AppText } from "~/design-system/components/app-text";
import { ScreenHeader } from "~/design-system/components/screen-header";
import { useCollapsibleHeader } from "~/design-system/hooks/use-collapsible-header";
import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "~/design-system/tokens";
import {
  buildCalendarDayEntries,
  buildCalendarDaySummaries,
  clampVisibleMonth,
  createCalendarScreenState,
  formatCalendarDayEntryMetaLine,
  formatSelectedDateSectionTitle,
  formatVisibleMonthTitle,
  getMinimumVisibleMonth,
  shiftVisibleMonth,
  syncCalendarScreenStateToTimezone,
} from "~/features/calendar-view/calendar-screen.helpers";
import {
  CALENDAR_DAY_CELL_HEIGHT,
  CalendarDayCell,
} from "~/features/calendar-view/components/calendar-day-cell";
import { MAIN_BOTTOM_NAV_RESERVED_HEIGHT } from "~/features/navigation/constants/main-bottom-nav-layout";
import { RecurringItemSummaryRow } from "~/features/recurring/components/recurring-item-summary-row";
import { useOccurrenceProjectionNow } from "~/features/recurring/hooks/use-occurrence-projection-now";
import { useOccurrenceProjectionQuery } from "~/features/recurring/hooks/use-occurrence-projection-query";
import { useRecurringFeedContext } from "~/features/recurring/hooks/use-recurring-feed-context";
import { getErrorMessage } from "~/lib/errors/get-error-message";

LocaleConfig.locales.ko = {
  dayNames: [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ],
  dayNamesShort: ["일", "월", "화", "수", "목", "금", "토"],
  monthNames: [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ],
  monthNamesShort: [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ],
  today: "오늘",
};
LocaleConfig.defaultLocale = "ko";

const CALENDAR_ENTRY_PLACEHOLDER_COUNT = 2;

const calendarTheme = {
  arrowColor: colors.text,
  calendarBackground: colors.surface,
  dayTextColor: colors.text,
  monthTextColor: colors.text,
  selectedDayBackgroundColor: colors.primary,
  selectedDayTextColor: colors.primaryForeground,
  textDayFontFamily: typography.fontFamily.body,
  textDayHeaderFontFamily: typography.fontFamily.body,
  textDayHeaderFontSize: typography.label,
  textDayHeaderFontWeight: "600" as const,
  textDisabledColor: colors.dividerOnPrimary,
  textInactiveColor: colors.dividerOnPrimary,
  textMonthFontFamily: typography.fontFamily.body,
  textSectionTitleColor: colors.textMuted,
  todayTextColor: colors.text,
  weekVerticalMargin: spacing.xs,
  "stylesheet.calendar.header": {
    arrow: {
      display: "none",
    },
    dayTextAtIndex0: {
      color: colors.weekendSunday,
    },
    dayTextAtIndex6: {
      color: colors.weekendSaturday,
    },
    dayHeader: {
      color: colors.textMuted,
      fontFamily: typography.fontFamily.body,
      fontSize: typography.label,
      fontWeight: "600",
      marginBottom: 7,
      marginTop: 2,
      textAlign: "center",
      width: 32,
    },
    header: {
      display: "none",
    },
    headerContainer: {
      display: "none",
    },
    week: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 0,
    },
  },
};

export function CalendarScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const {
    headerAnimatedStyle,
    headerHeight,
    onHeaderHeightChange,
    onScroll,
    scrollEventThrottle,
  } = useCollapsibleHeader({ hiddenOffset: insets.top });
  const recurringFeedContext = useRecurringFeedContext();
  const now = useOccurrenceProjectionNow();
  const [screenState, setScreenState] = useState(() =>
    createCalendarScreenState(now, recurringFeedContext.timezone)
  );
  const previousTimezoneRef = useRef(recurringFeedContext.timezone);
  const projectionQuery = useOccurrenceProjectionQuery({
    context: recurringFeedContext,
    purpose: {
      type: "calendarMonth",
      visibleMonth: screenState.visibleMonth,
    },
  });
  const timezone = projectionQuery.timezone;
  const items = projectionQuery.items;
  const completionLogs = projectionQuery.completionLogs;
  const todayState = createCalendarScreenState(now, timezone);
  const minimumVisibleMonth = useMemo(
    () => getMinimumVisibleMonth(items),
    [items]
  );
  const selectedDateTitle = formatSelectedDateSectionTitle(
    screenState.selectedDate
  );
  const visibleMonthTitle = formatVisibleMonthTitle(screenState.visibleMonth);
  const isLoading = projectionQuery.isLoading;
  const errorMessage = projectionQuery.error
    ? getErrorMessage(projectionQuery.error)
    : null;
  const daySummaries = useMemo(
    () =>
      buildCalendarDaySummaries({
        completionLogs,
        items,
        now,
        timezone,
        visibleMonth: screenState.visibleMonth,
      }),
    [completionLogs, items, now, screenState.visibleMonth, timezone]
  );
  const selectedEntries = useMemo(
    () =>
      buildCalendarDayEntries({
        completionLogs,
        items,
        now,
        selectedDate: screenState.selectedDate,
        timezone,
      }),
    [completionLogs, items, now, screenState.selectedDate, timezone]
  );
  const isPreviousMonthDisabled =
    minimumVisibleMonth !== null &&
    screenState.visibleMonth.localeCompare(minimumVisibleMonth) <= 0;

  const handleDayPress = (date: DateData) => {
    setScreenState((prevState) => ({
      ...prevState,
      selectedDate: date.dateString,
    }));
  };

  const handleRetry = () => {
    void projectionQuery.refetch();
  };

  useEffect(() => {
    const previousTimezone = previousTimezoneRef.current;

    if (previousTimezone === timezone) {
      return;
    }

    previousTimezoneRef.current = timezone;
    setScreenState((previousState) =>
      syncCalendarScreenStateToTimezone({
        now,
        previousState,
        previousTimezone,
        timezone,
      })
    );
  }, [now, timezone]);

  const shiftMonth = (amount: number) => {
    setScreenState((prevState) => ({
      ...prevState,
      visibleMonth: clampVisibleMonth(
        shiftVisibleMonth(prevState.visibleMonth, amount),
        minimumVisibleMonth
      ),
    }));
  };

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <Animated.View style={[styles.headerLayer, headerAnimatedStyle]}>
        <ScreenHeader onHeightChange={onHeaderHeightChange} title="캘린더" />
      </Animated.View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + spacing.md },
          {
            paddingBottom: MAIN_BOTTOM_NAV_RESERVED_HEIGHT + insets.bottom,
          },
        ]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.monthHeader}>
          <MonthArrowButton
            accessibilityLabel="이전 달 보기"
            disabled={isPreviousMonthDisabled}
            icon={<ChevronLeft color={colors.primaryForeground} size={18} />}
            onPress={() => {
              shiftMonth(-1);
            }}
          />
          <AppText style={styles.monthTitle} variant="title">
            {visibleMonthTitle}
          </AppText>
          <MonthArrowButton
            accessibilityLabel="다음 달 보기"
            icon={<ChevronRight color={colors.primaryForeground} size={18} />}
            onPress={() => {
              shiftMonth(1);
            }}
          />
        </View>

        <View style={styles.calendarCard}>
          <Calendar
            key={screenState.visibleMonth}
            current={`${screenState.visibleMonth}-01`}
            dayComponent={({ date }) =>
              date ? (
                <CalendarDayCell
                  date={date}
                  isSelected={date.dateString === screenState.selectedDate}
                  isToday={date.dateString === todayState.selectedDate}
                  overflowCount={
                    daySummaries[date.dateString]?.overflowCount ?? 0
                  }
                  markerColorKeys={
                    daySummaries[date.dateString]?.markerColorKeys ?? []
                  }
                  onPress={handleDayPress}
                />
              ) : (
                <View style={styles.emptyDayCell} />
              )
            }
            firstDay={0}
            hideArrows
            hideExtraDays
            onDayPress={handleDayPress}
            style={styles.calendar}
            theme={calendarTheme}
          />
        </View>

        <View style={styles.selectedDateSection}>
          <View style={styles.selectedDateHeader}>
            <AppText style={styles.selectedDateTitle} variant="body2">
              {selectedDateTitle}
            </AppText>
            <AppText style={styles.selectedDateCount} variant="body3">
              {selectedEntries.length}개
            </AppText>
          </View>

          {isLoading ? (
            <CalendarEntryListPlaceholder />
          ) : errorMessage ? (
            <AppRetryStatePanel
              description={errorMessage}
              minHeight={96}
              onRetry={handleRetry}
              panelStyle={styles.emptyCard}
              retryAccessibilityHint="캘린더 조회를 다시 시도해요."
              retryAccessibilityLabel="캘린더 다시 불러오기"
              title="캘린더를 불러오지 못했어요"
              variant="dashed"
            />
          ) : selectedEntries.length === 0 ? (
            <AppEmptyStateView
              style={styles.selectedDateState}
              title="선택한 날짜에 일정이 없어요"
            />
          ) : (
            <View>
              {selectedEntries.map((entry, index) => (
                <RecurringItemSummaryRow
                  accessibilityHint="반복 항목 상세 화면으로 이동해요."
                  colorKey={entry.colorKey}
                  isLast={index === selectedEntries.length - 1}
                  key={`${entry.itemId}:${entry.scheduledAtUtc}`}
                  metaLine={formatCalendarDayEntryMetaLine(entry)}
                  onPress={() => {
                    router.push({
                      params: {
                        itemId: entry.itemId,
                        returnTo: "/calendar",
                        scheduledAtUtc: entry.scheduledAtUtc,
                      },
                      pathname: "/items/[itemId]",
                    });
                  }}
                  title={entry.title}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

function MonthArrowButton({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: React.JSX.Element;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityHint="보이는 월을 이동해요."
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.monthArrowButton,
        disabled && styles.monthArrowButtonDisabled,
        pressed && styles.monthArrowButtonPressed,
      ]}
    >
      {icon}
    </Pressable>
  );
}

function CalendarEntryListPlaceholder(): React.JSX.Element {
  return (
    <View
      accessibilityLabel="일정을 불러오는 중"
      accessibilityRole="progressbar"
    >
      {Array.from({ length: CALENDAR_ENTRY_PLACEHOLDER_COUNT }).map(
        (_, index) => (
          <View
            key={index}
            style={[
              styles.placeholderRow,
              index < CALENDAR_ENTRY_PLACEHOLDER_COUNT - 1
                ? styles.placeholderDivider
                : undefined,
            ]}
          >
            <View style={styles.placeholderCopy}>
              <View style={styles.placeholderTitle} />
              <View style={styles.placeholderMeta} />
            </View>
            <View style={styles.placeholderAction} />
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    borderRadius: borderRadius.lg,
  },
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
    paddingTop: spacing.md,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  emptyCard: {
    gap: spacing.xs,
    minHeight: 144,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyDayCell: {
    height: CALENDAR_DAY_CELL_HEIGHT,
    width: 42,
  },
  headerLayer: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  monthArrowButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  monthArrowButtonPressed: {
    opacity: 0.88,
  },
  monthArrowButtonDisabled: {
    opacity: 0.4,
  },
  monthHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  monthTitle: {
    color: colors.text,
    flex: 1,
    textAlign: "center",
  },
  placeholderAction: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: 34,
    width: 34,
  },
  placeholderCopy: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
  },
  placeholderDivider: {
    borderBottomColor: colors.dividerOnPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  placeholderMeta: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: typography.lineHeight.caption,
    opacity: 0.72,
    width: "36%",
  },
  placeholderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  placeholderTitle: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: typography.lineHeight.body,
    width: "44%",
  },
  selectedDateCount: {
    color: colors.textSoft,
  },
  selectedDateHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  selectedDateSection: {
    gap: spacing.xxs,
  },
  selectedDateTitle: {
    color: colors.text,
    flex: 1,
  },
  selectedDateState: {
    minHeight: 96,
  },
  screenContent: {
    flex: 1,
  },
});
