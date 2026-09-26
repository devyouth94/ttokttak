import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import type { CalendarDayEntry } from "~/screens/calendar/calendar";
import { useCalendarScreen } from "~/screens/calendar/query";
import { CalendarMonthSection } from "~/screens/calendar/ui/calendar-month-section";
import { SelectedDateSection } from "~/screens/calendar/ui/selected-date-section";
import { AppScreen } from "~/ui/app-screen";
import { getMainTabContentBottomInset } from "~/ui/main-bottom-nav";
import { ScreenHeader } from "~/ui/screen-header";
import { spacing } from "~/ui/tokens";

export default function CalendarTabPage(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const calendar = useCalendarScreen();

  function openEntry(entry: CalendarDayEntry): void {
    router.push({
      params: {
        itemId: entry.itemId,
        returnTo: "/calendar",
        scheduledAtUtc: entry.scheduledAtUtc,
      },
      pathname: "/items/[itemId]",
    });
  }

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
          occurrenceEntries={calendar.occurrenceEntries}
          onSelectDate={calendar.selectDate}
          selectedDate={calendar.selectedDate}
          today={calendar.today}
        />

        <SelectedDateSection
          errorMessage={calendar.errorMessage}
          isLoading={calendar.isLoading}
          onPressEntry={openEntry}
          onRetry={() => {
            void calendar.retry();
          }}
          occurrenceEntries={calendar.occurrenceEntries}
          selectedDate={calendar.selectedDate}
          timezone={calendar.timezone}
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
