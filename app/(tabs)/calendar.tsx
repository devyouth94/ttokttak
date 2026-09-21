import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { formatInTimeZone } from "date-fns-tz";

import { getErrorMessage } from "~/errors";
import { useNow } from "~/schedule/now";
import { syncSelectedDateToTimezone } from "~/screens/calendar/calendar";
import { useCalendarQuery } from "~/screens/calendar/query";
import { CalendarMonthSection } from "~/screens/calendar/ui/calendar-month-section";
import { SelectedDateSection } from "~/screens/calendar/ui/selected-date-section";
import { useSession } from "~/session/provider";
import { AppScreen } from "~/ui/app-screen";
import { getMainTabContentBottomInset } from "~/ui/main-bottom-nav";
import { ScreenHeader } from "~/ui/screen-header";
import { spacing } from "~/ui/tokens";

export default function CalendarTabPage(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile } = useSession();

  const initialTimezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = useNow();

  const [selectedDate, setSelectedDate] = useState(() =>
    formatInTimeZone(now, initialTimezone, "yyyy-MM-dd")
  );

  const previousTimezoneRef = useRef(initialTimezone);

  const calendarQuery = useCalendarQuery({
    now,
    selectedDate,
  });
  const timezone = calendarQuery.timezone;
  const today = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const errorMessage = calendarQuery.error
    ? getErrorMessage(calendarQuery.error)
    : null;

  useEffect(() => {
    const previousTimezone = previousTimezoneRef.current;

    if (previousTimezone === timezone) {
      return;
    }

    previousTimezoneRef.current = timezone;
    setSelectedDate((previousDate) =>
      syncSelectedDateToTimezone({
        now,
        previousDate,
        previousTimezone,
        timezone,
      })
    );
  }, [now, timezone, today]);

  return (
    <AppScreen>
      <ScreenHeader title={t("calendar.headerTitle")} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: getMainTabContentBottomInset(insets.bottom),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <CalendarMonthSection
          occurrenceEntries={calendarQuery.occurrenceEntries}
          onSelectDate={setSelectedDate}
          selectedDate={selectedDate}
          today={today}
        />

        <SelectedDateSection
          errorMessage={errorMessage}
          isLoading={calendarQuery.isLoading}
          onPressEntry={(entry) => {
            router.push({
              params: {
                itemId: entry.itemId,
                returnTo: "/calendar",
                scheduledAtUtc: entry.scheduledAtUtc,
              },
              pathname: "/items/[itemId]",
            });
          }}
          onRetry={() => {
            void calendarQuery.refetch();
          }}
          occurrenceEntries={calendarQuery.occurrenceEntries}
          selectedDate={selectedDate}
          timezone={timezone}
        />
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
});
