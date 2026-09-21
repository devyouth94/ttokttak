import { useLayoutEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import type { AppLanguage } from "~/i18n/language";
import { useAppLanguage } from "~/i18n/provider";
import { formatLocal } from "~/schedule/display/date";
import type { OccurrenceEntry } from "~/schedule/rules/occurrence";
import { buildCalendarDaySummaries } from "~/screens/calendar/calendar";
import type { ThemeColors } from "~/theme/colors";
import { useTheme } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing, typography } from "~/ui/tokens";

import { CalendarDayCell } from "./calendar-day-cell";

const koDayNamesShort = ["일", "월", "화", "수", "목", "금", "토"];
const koMonthNames = Array.from({ length: 12 }, (_, index) => `${index + 1}월`);

LocaleConfig.locales.ko = {
  dayNames: koDayNamesShort.map((day) => `${day}요일`),
  dayNamesShort: koDayNamesShort,
  monthNames: koMonthNames,
  monthNamesShort: koMonthNames,
  today: "오늘",
};

export function CalendarMonthSection({
  onSelectDate,
  occurrenceEntries,
  selectedDate,
  today,
}: {
  onSelectDate: (date: string) => void;
  occurrenceEntries: OccurrenceEntry[];
  selectedDate: string;
  today: string;
}): React.JSX.Element | null {
  const { language } = useAppLanguage();
  const { colors: themeColors, resolvedTheme } = useTheme();
  const isCalendarLocaleReady = useCalendarLocale(language);

  const calendarTheme = useMemo(
    () => createCalendarTheme(themeColors),
    [themeColors]
  );
  const daySummaries = useMemo(
    () => buildCalendarDaySummaries(occurrenceEntries),
    [occurrenceEntries]
  );
  const visibleMonth = selectedDate.slice(0, 7);

  if (!isCalendarLocaleReady) {
    return null;
  }

  return (
    <Calendar
      key={`${visibleMonth}:${resolvedTheme}:${language}`}
      current={selectedDate}
      dayComponent={({ date }) =>
        date && (
          <CalendarDayCell
            date={date}
            isSelected={date.dateString === selectedDate}
            isToday={date.dateString === today}
            overflowCount={daySummaries[date.dateString]?.overflowCount ?? 0}
            markerColors={daySummaries[date.dateString]?.markerColors ?? []}
            onPress={(pressedDate) => {
              onSelectDate(pressedDate.dateString);
            }}
          />
        )
      }
      hideExtraDays
      onMonthChange={(month) => {
        onSelectDate(`${month.dateString.slice(0, 7)}-01`);
      }}
      renderArrow={(direction) =>
        direction === "left" ? (
          <ChevronLeft color={themeColors.primaryForeground} size={18} />
        ) : (
          <ChevronRight color={themeColors.primaryForeground} size={18} />
        )
      }
      renderHeader={(month) => (
        <AppText
          style={[styles.monthTitle, { color: themeColors.text }]}
          variant="title"
        >
          {formatLocal(
            month?.toString("yyyy-MM") ?? visibleMonth,
            "month",
            language
          )}
        </AppText>
      )}
      theme={calendarTheme}
    />
  );
}

function useCalendarLocale(language: AppLanguage): boolean {
  const [readyLanguage, setReadyLanguage] = useState<AppLanguage | null>(null);

  useLayoutEffect(() => {
    LocaleConfig.defaultLocale = language === "ko" ? "ko" : "";
    setReadyLanguage(language);
  }, [language]);

  return readyLanguage === language;
}

function createCalendarTheme(themeColors: ThemeColors) {
  return {
    arrowStyle: {
      alignItems: "center",
      backgroundColor: themeColors.primary,
      borderRadius: borderRadius.pill,
      height: 32,
      justifyContent: "center",
      padding: 0,
      width: 32,
    },
    textDayHeaderFontFamily: typography.fontFamily.body,
    textDayHeaderFontSize: typography.label,
    textDayHeaderFontWeight: typography.fontWeight.semibold,
    textSectionTitleColor: themeColors.textMuted,
    weekVerticalMargin: spacing.xs,
    "stylesheet.calendar.header": {
      dayTextAtIndex0: { color: themeColors.red },
      dayTextAtIndex6: { color: themeColors.blue },
      header: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: spacing.md,
        marginTop: 0,
        paddingHorizontal: 0,
      },
      headerContainer: {
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
      },
      week: {
        backgroundColor: themeColors.surface,
        borderTopLeftRadius: borderRadius.lg,
        borderTopRightRadius: borderRadius.lg,
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 0,
        paddingHorizontal: spacing.xs,
        paddingTop: spacing.md,
      },
    },
    "stylesheet.calendar.main": {
      container: {
        backgroundColor: "transparent",
        paddingLeft: 0,
        paddingRight: 0,
      },
      monthView: {
        backgroundColor: themeColors.surface,
        borderBottomLeftRadius: borderRadius.lg,
        borderBottomRightRadius: borderRadius.lg,
        paddingBottom: spacing.xs,
        paddingHorizontal: spacing.xs,
      },
    },
  } as const;
}

const styles = StyleSheet.create({
  monthTitle: {
    textAlign: "center",
  },
});
