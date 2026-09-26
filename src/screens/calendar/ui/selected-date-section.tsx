import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAppLanguage } from "~/i18n/provider";
import { formatLocal } from "~/schedule/display/date";
import type { OccurrenceEntry } from "~/schedule/rules/occurrence";
import { ItemRow } from "~/schedule/ui/item-row";
import {
  buildCalendarDayEntries,
  type CalendarDayEntry,
} from "~/screens/calendar/calendar";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { StateMessage } from "~/ui/state-message";
import { spacing } from "~/ui/tokens";

export function SelectedDateSection({
  errorMessage,
  isLoading,
  onPressEntry,
  onRetry,
  occurrenceEntries,
  selectedDate,
  timezone,
}: {
  errorMessage: string | null;
  isLoading: boolean;
  onPressEntry: (entry: CalendarDayEntry) => void;
  onRetry: () => void;
  occurrenceEntries: OccurrenceEntry[];
  selectedDate: string;
  timezone: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const themeColors = useThemeColors();

  const selectedDateTitle = formatLocal(selectedDate, "weekdayDate", language);
  const entries = useMemo(
    () =>
      buildCalendarDayEntries({
        entries: occurrenceEntries,
        language,
        selectedDate,
        timezone,
        unavailableTitle: t("schedule.contentUnavailableTitle"),
      }),
    [language, occurrenceEntries, selectedDate, t, timezone]
  );

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText
          style={[styles.title, { color: themeColors.text }]}
          variant="body2"
        >
          {selectedDateTitle}
        </AppText>

        {!isLoading && !errorMessage && (
          <AppText style={{ color: themeColors.textSoft }} variant="body3">
            {t("calendar.entryCount", { count: entries.length })}
          </AppText>
        )}
      </View>

      {/* 로딩 상태 */}
      {isLoading && (
        <ActivityIndicator
          accessibilityLabel={t("calendar.loadingA11yLabel")}
          accessibilityRole="progressbar"
          color={themeColors.primary}
          style={styles.state}
        />
      )}

      {/* 오류 상태 */}
      {!isLoading && errorMessage && (
        <StateMessage
          action={{
            accessibilityHint: t("calendar.error.retryHint"),
            accessibilityLabel: t("calendar.error.retryLabel"),
            label: t("calendar.error.retryLabel"),
            onPress: onRetry,
          }}
          description={errorMessage}
          style={styles.error}
          title={t("calendar.error.title")}
        />
      )}

      {/* 빈 상태 */}
      {!isLoading && !errorMessage && entries.length === 0 && (
        <StateMessage style={styles.state} title={t("calendar.emptyTitle")} />
      )}

      {/* 일정 목록 */}
      {!isLoading && !errorMessage && entries.length > 0 && (
        <View>
          {entries.map((entry, index) => (
            <ItemRow
              accessibilityHint={t("calendar.row.detailHint")}
              accessibilityLabel={t("calendar.row.detailLabel", {
                title: entry.title,
              })}
              colorHex={entry.colorHex}
              isLast={index === entries.length - 1}
              key={`${entry.itemId}:${entry.scheduledAtUtc}`}
              metaLine={[
                entry.timeLabel,
                t(`calendar.status.${entry.status}`),
              ].join(" · ")}
              onPress={() => {
                onPressEntry(entry);
              }}
              title={entry.title}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    flex: 0,
    gap: spacing.xs,
    minHeight: 144,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  section: {
    gap: spacing.xxs,
  },
  state: {
    flex: 0,
    minHeight: 96,
  },
  title: {
    flex: 1,
  },
});
