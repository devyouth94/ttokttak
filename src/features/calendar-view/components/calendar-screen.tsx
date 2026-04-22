import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Calendar, type DateData, LocaleConfig } from "react-native-calendars";
import { router } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import { ScreenHeader } from "~/design-system/components/screen-header";
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
  createCalendarMarkedDates,
  createCalendarScreenState,
  formatSelectedDateSectionTitle,
  formatVisibleMonthTitle,
  getMinimumVisibleMonth,
  shiftVisibleMonth,
} from "~/features/calendar-view/calendar-screen.helpers";
import { CalendarDayCell } from "~/features/calendar-view/components/calendar-day-cell";
import { CalendarEntryCard } from "~/features/calendar-view/components/calendar-entry-card";
import { useCompletionLogsQuery } from "~/features/recurring/hooks/use-completion-logs-query";
import { useRecurringFeedContext } from "~/features/recurring/hooks/use-recurring-feed-context";
import { useRecurringItemsQuery } from "~/features/recurring/hooks/use-recurring-items-query";
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

const legendItems = [
  { color: colors.statusScheduled, label: "예정" },
  { color: colors.statusCompleted, label: "완료" },
  { color: colors.statusSkipped, label: "건너뜀" },
  { color: colors.statusOverdue, label: "놓침" },
] as const;

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
  textDisabledColor: colors.outlineSoft,
  textInactiveColor: colors.outlineSoft,
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
  const { isReady, timezone, userId } = useRecurringFeedContext();
  const [screenState, setScreenState] = useState(() =>
    createCalendarScreenState(new Date())
  );
  const todayState = createCalendarScreenState(new Date());
  const itemsQuery = useRecurringItemsQuery({
    enabled: isReady,
    timezone,
    userId,
  });
  const items = itemsQuery.data;
  const completionLogsQuery = useCompletionLogsQuery({
    enabled: isReady && (items?.length ?? 0) > 0,
    itemIds: items?.map((item) => item.id) ?? [],
    userId,
  });
  const completionLogs = completionLogsQuery.data;
  const minimumVisibleMonth = useMemo(
    () => getMinimumVisibleMonth(items ?? []),
    [items]
  );
  const showsTodayButton = screenState.selectedDate !== todayState.selectedDate;
  const selectedDateTitle = formatSelectedDateSectionTitle(
    screenState.selectedDate
  );
  const visibleMonthTitle = formatVisibleMonthTitle(screenState.visibleMonth);
  const isLoading =
    itemsQuery.isPending ||
    ((items?.length ?? 0) > 0 && completionLogsQuery.isPending);
  const errorMessage = itemsQuery.error
    ? getErrorMessage(itemsQuery.error)
    : completionLogsQuery.error
      ? getErrorMessage(completionLogsQuery.error)
      : null;
  const daySummaries = useMemo(
    () =>
      buildCalendarDaySummaries({
        completionLogs: completionLogs ?? [],
        items: items ?? [],
        now: new Date(),
        timezone,
        visibleMonth: screenState.visibleMonth,
      }),
    [completionLogs, items, screenState.visibleMonth, timezone]
  );
  const selectedEntries = useMemo(
    () =>
      buildCalendarDayEntries({
        completionLogs: completionLogs ?? [],
        items: items ?? [],
        now: new Date(),
        selectedDate: screenState.selectedDate,
        timezone,
      }),
    [completionLogs, items, screenState.selectedDate, timezone]
  );
  const isPreviousMonthDisabled =
    minimumVisibleMonth !== null &&
    screenState.visibleMonth.localeCompare(minimumVisibleMonth) <= 0;

  const markedDates = useMemo(
    () =>
      createCalendarMarkedDates({
        daySummaries,
        selectedDate: screenState.selectedDate,
        todayDate: todayState.selectedDate,
      }),
    [daySummaries, screenState.selectedDate, todayState.selectedDate]
  );

  const handleDayPress = (date: DateData) => {
    setScreenState((prevState) => ({
      ...prevState,
      selectedDate: date.dateString,
    }));
  };

  const handleMonthChange = (date: DateData) => {
    setScreenState((prevState) => ({
      ...prevState,
      visibleMonth: clampVisibleMonth(
        `${date.year}-${String(date.month).padStart(2, "0")}`,
        minimumVisibleMonth
      ),
    }));
  };

  const moveToToday = () => {
    setScreenState(todayState);
  };

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
    <AppScreen>
      <ScreenHeader
        rightSlot={
          showsTodayButton ? (
            <Pressable
              accessibilityHint="현재 월과 선택 날짜를 오늘로 맞춥니다."
              accessibilityLabel="오늘로 이동"
              accessibilityRole="button"
              onPress={moveToToday}
              style={({ pressed }) => [
                styles.todayButton,
                pressed && styles.todayButtonPressed,
              ]}
            >
              <AppText style={styles.todayButtonText}>오늘</AppText>
            </Pressable>
          ) : undefined
        }
        title="캘린더"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.monthHeader}>
          <AppText style={styles.monthTitle} variant="title">
            {visibleMonthTitle}
          </AppText>
          <View style={styles.monthHeaderActions}>
            <MonthArrowButton
              accessibilityLabel="이전 달 보기"
              disabled={isPreviousMonthDisabled}
              icon={<ChevronLeft color={colors.text} size={18} />}
              onPress={() => {
                shiftMonth(-1);
              }}
            />
            <MonthArrowButton
              accessibilityLabel="다음 달 보기"
              icon={<ChevronRight color={colors.text} size={18} />}
              onPress={() => {
                shiftMonth(1);
              }}
            />
          </View>
        </View>

        <View style={styles.calendarCard}>
          {isLoading ? (
            <View style={styles.calendarLoadingState}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : null}
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
                  markerStatuses={
                    daySummaries[date.dateString]?.markerStatuses ?? []
                  }
                  onPress={handleDayPress}
                />
              ) : (
                <View style={styles.emptyDayCell} />
              )
            }
            enableSwipeMonths
            firstDay={0}
            hideArrows
            hideExtraDays
            markingType="multi-dot"
            markedDates={markedDates}
            onDayPress={handleDayPress}
            onMonthChange={handleMonthChange}
            style={styles.calendar}
            theme={calendarTheme}
          />
        </View>

        <View style={styles.legendRow}>
          {legendItems.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: item.color }]}
              />
              <AppText style={styles.legendLabel}>{item.label}</AppText>
            </View>
          ))}
        </View>

        <View style={styles.selectedDateHeader}>
          <AppText style={styles.selectedDateTitle} variant="title">
            {selectedDateTitle}
          </AppText>
          <AppText style={styles.selectedDateCount}>
            {selectedEntries.length}개
          </AppText>
        </View>

        {errorMessage ? (
          <View style={styles.emptyCard}>
            <AppText style={styles.emptyTitle} variant="title">
              {errorMessage}
            </AppText>
          </View>
        ) : selectedEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppText style={styles.emptyTitle} variant="title">
              이 날짜의 일정이 없습니다.
            </AppText>
          </View>
        ) : (
          <View style={styles.entryList}>
            {selectedEntries.map((entry) => (
              <CalendarEntryCard
                entry={entry}
                key={`${entry.itemId}:${entry.scheduledAtUtc}`}
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
              />
            ))}
          </View>
        )}
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
      accessibilityHint="보이는 월을 이동합니다."
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
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

const styles = StyleSheet.create({
  calendar: {
    borderRadius: borderRadius.lg,
  },
  calendarCard: {
    backgroundColor: colors.surface,
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xl,
  },
  calendarLoadingState: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  entryList: {
    gap: spacing.md,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: 144,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyDayCell: {
    height: 42,
    width: 42,
  },
  emptyDescription: {
    color: colors.textMuted,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: typography.body,
    textAlign: "center",
  },
  legendDot: {
    borderRadius: borderRadius.pill,
    height: 8,
    width: 8,
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  legendLabel: {
    color: colors.textMuted,
    fontSize: typography.label,
    lineHeight: 18,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "center",
  },
  monthArrowButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceHigh,
    borderRadius: borderRadius.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
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
  monthHeaderActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  monthTitle: {
    flex: 1,
    fontSize: typography.title,
    lineHeight: 28,
    paddingRight: spacing.md,
  },
  selectedDateCount: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  selectedDateHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  selectedDateTitle: {
    flex: 1,
    fontSize: 24,
    lineHeight: 32,
    paddingRight: spacing.sm,
  },
  todayButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceHigh,
    borderRadius: borderRadius.pill,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 56,
    paddingHorizontal: spacing.md,
  },
  todayButtonPressed: {
    opacity: 0.88,
  },
  todayButtonText: {
    fontSize: typography.body,
    fontWeight: "600",
  },
});
