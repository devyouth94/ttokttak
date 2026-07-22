import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Calendar, type DateData, LocaleConfig } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import { MAIN_BOTTOM_NAV_RESERVED_HEIGHT } from "~/application/navigation";
import { useScheduleReadContext } from "~/application/schedule-read";
import {
  formatVisibleMonthTitle,
  formatWeekdayLocalDateTitle,
} from "~/entities/schedule";
import {
  useCalendarMonthOccurrenceProjectionQuery,
  useOccurrenceProjectionNow,
} from "~/features/read-schedule";
import { ItemRow } from "~/schedule/ui/item-row";
import { useAppLanguage } from "~/shared/i18n";
import { getErrorMessage } from "~/shared/lib/errors/get-error-message";
import { AppScreen } from "~/shared/ui/app-screen";
import { AppText } from "~/shared/ui/app-text";
import { ScreenHeader } from "~/shared/ui/screen-header";
import { borderRadius, spacing, typography } from "~/shared/ui/tokens";
import type { ThemeColors } from "~/theme/colors";
import { useTheme, useThemeColors } from "~/theme/context";
import { StateMessage } from "~/ui/state-message";

import { CALENDAR_DAY_CELL_HEIGHT, CalendarDayCell } from "./calendar-day-cell";
import { getCalendarRenderKey } from "./calendar-render-key";
import {
  buildCalendarDayEntries,
  buildCalendarDaySummaries,
  calendarLocaleConfigByLanguage,
  clampVisibleMonth,
  createCalendarScreenState,
  formatCalendarDayEntryCount,
  getMinimumVisibleMonth,
  shiftVisibleMonth,
  syncCalendarScreenStateToTimezone,
} from "../model/calendar-screen-model";

LocaleConfig.locales.ko = calendarLocaleConfigByLanguage.ko;
LocaleConfig.locales.en = calendarLocaleConfigByLanguage.en;
LocaleConfig.defaultLocale = "ko";

const CALENDAR_ENTRY_PLACEHOLDER_COUNT = 2;

function createCalendarTheme(themeColors: ThemeColors) {
  return {
    arrowColor: themeColors.text,
    calendarBackground: themeColors.surface,
    dayTextColor: themeColors.text,
    monthTextColor: themeColors.text,
    selectedDayBackgroundColor: themeColors.primary,
    selectedDayTextColor: themeColors.primaryForeground,
    textDayFontFamily: typography.fontFamily.body,
    textDayHeaderFontFamily: typography.fontFamily.body,
    textDayHeaderFontSize: typography.label,
    textDayHeaderFontWeight: "600" as const,
    textDisabledColor: themeColors.textDisabled,
    textInactiveColor: themeColors.textDisabled,
    textMonthFontFamily: typography.fontFamily.body,
    textSectionTitleColor: themeColors.textMuted,
    todayTextColor: themeColors.text,
    weekVerticalMargin: spacing.xs,
    "stylesheet.calendar.header": {
      arrow: {
        display: "none",
      },
      dayTextAtIndex0: {
        color: themeColors.red,
      },
      dayTextAtIndex6: {
        color: themeColors.blue,
      },
      dayHeader: {
        color: themeColors.textMuted,
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
}

export function CalendarScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const { colors: themeColors, resolvedTheme } = useTheme();
  const styles = useCalendarScreenStyles();
  const calendarTheme = useMemo(
    () => createCalendarTheme(themeColors),
    [themeColors]
  );
  const insets = useSafeAreaInsets();
  const scheduleReadContext = useScheduleReadContext();
  const now = useOccurrenceProjectionNow();
  const [screenState, setScreenState] = useState(() =>
    createCalendarScreenState(now, scheduleReadContext.timezone)
  );
  const calendarRenderKey = getCalendarRenderKey({
    resolvedTheme,
    visibleMonth: screenState.visibleMonth,
  });
  const previousTimezoneRef = useRef(scheduleReadContext.timezone);
  const projectionQuery = useCalendarMonthOccurrenceProjectionQuery({
    context: scheduleReadContext,
    now,
    selectedDate: screenState.selectedDate,
    visibleMonth: screenState.visibleMonth,
  });
  const timezone = projectionQuery.timezone;
  const items = projectionQuery.items;
  const todayState = createCalendarScreenState(now, timezone);
  const minimumVisibleMonth = useMemo(
    () => getMinimumVisibleMonth(items),
    [items]
  );
  const selectedDateTitle = formatWeekdayLocalDateTitle(
    screenState.selectedDate,
    language
  );
  const visibleMonthTitle = formatVisibleMonthTitle(
    screenState.visibleMonth,
    language
  );
  const isLoading = projectionQuery.isLoading;
  const errorMessage = projectionQuery.error
    ? getErrorMessage(projectionQuery.error)
    : null;
  const daySummaries = useMemo(
    () =>
      buildCalendarDaySummaries({
        visibleMonthEntries: projectionQuery.visibleMonthEntries,
      }),
    [projectionQuery.visibleMonthEntries]
  );
  const selectedEntries = useMemo(
    () =>
      buildCalendarDayEntries({
        language,
        selectedDateEntries: projectionQuery.selectedDateEntries,
        timezone,
      }),
    [language, projectionQuery.selectedDateEntries, timezone]
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
    LocaleConfig.defaultLocale = language;
  }, [language]);

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
    <AppScreen>
      <ScreenHeader title={t("calendar.headerTitle")} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: MAIN_BOTTOM_NAV_RESERVED_HEIGHT + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.monthHeader}>
          <MonthArrowButton
            accessibilityLabel={t("calendar.previousMonthLabel")}
            disabled={isPreviousMonthDisabled}
            icon={
              <ChevronLeft color={themeColors.primaryForeground} size={18} />
            }
            onPress={() => {
              shiftMonth(-1);
            }}
          />
          <AppText style={styles.monthTitle} variant="title">
            {visibleMonthTitle}
          </AppText>
          <MonthArrowButton
            accessibilityLabel={t("calendar.nextMonthLabel")}
            icon={
              <ChevronRight color={themeColors.primaryForeground} size={18} />
            }
            onPress={() => {
              shiftMonth(1);
            }}
          />
        </View>

        <View style={styles.calendarCard}>
          <Calendar
            key={calendarRenderKey}
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
              {formatCalendarDayEntryCount(selectedEntries.length, language)}
            </AppText>
          </View>

          {isLoading ? (
            <CalendarEntryListPlaceholder />
          ) : errorMessage ? (
            <StateMessage
              action={{
                accessibilityHint: t("calendar.error.retryHint"),
                accessibilityLabel: t("calendar.error.retryLabel"),
                label: t("calendar.error.retryLabel"),
                onPress: handleRetry,
              }}
              description={errorMessage}
              style={styles.selectedDateError}
              title={t("calendar.error.title")}
            />
          ) : selectedEntries.length === 0 ? (
            <StateMessage
              style={styles.selectedDateState}
              title={t("calendar.emptyTitle")}
            />
          ) : (
            <View>
              {selectedEntries.map((entry, index) => (
                <ItemRow
                  accessibilityHint={t("calendar.row.detailHint")}
                  accessibilityLabel={t("calendar.row.detailLabel", {
                    title: entry.title,
                  })}
                  colorKey={entry.colorKey}
                  isLast={index === selectedEntries.length - 1}
                  key={`${entry.itemId}:${entry.scheduledAtUtc}`}
                  metaLine={[entry.timeLabel, entry.statusLabel].join(" · ")}
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
  const { t } = useTranslation();
  const styles = useCalendarScreenStyles();

  return (
    <Pressable
      accessibilityHint={t("calendar.monthArrowHint")}
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
  const { t } = useTranslation();
  const styles = useCalendarScreenStyles();

  return (
    <View
      accessibilityLabel={t("calendar.loadingA11yLabel")}
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

function useCalendarScreenStyles() {
  const themeColors = useThemeColors();

  return useMemo(() => createCalendarScreenStyles(themeColors), [themeColors]);
}

function createCalendarScreenStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
    calendar: {
      borderRadius: borderRadius.lg,
    },
    calendarCard: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.xs,
      paddingBottom: spacing.xs,
      paddingTop: spacing.md,
    },
    content: {
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    selectedDateError: {
      flex: 0,
      gap: spacing.xs,
      minHeight: 144,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
    },
    emptyDayCell: {
      height: CALENDAR_DAY_CELL_HEIGHT,
      width: 42,
    },
    monthArrowButton: {
      alignItems: "center",
      backgroundColor: themeColors.primary,
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
      color: themeColors.text,
      flex: 1,
      textAlign: "center",
    },
    placeholderAction: {
      backgroundColor: themeColors.surface,
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
      borderBottomColor: themeColors.divider,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    placeholderMeta: {
      backgroundColor: themeColors.surface,
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
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.pill,
      height: typography.lineHeight.body,
      width: "44%",
    },
    selectedDateCount: {
      color: themeColors.textSoft,
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
      color: themeColors.text,
      flex: 1,
    },
    selectedDateState: {
      flex: 0,
      minHeight: 96,
    },
  });
}
