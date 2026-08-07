import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import type { DateData } from "react-native-calendars";

import { useAppLanguage } from "~/i18n/provider";
import {
  colorByKey,
  type ColorKey,
  getColorLabel,
} from "~/schedule/display/color";
import { formatLocal } from "~/schedule/display/date";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, typography } from "~/ui/tokens";

type CalendarDayCellProps = {
  date: DateData;
  isSelected: boolean;
  isToday: boolean;
  markerColorKeys: ColorKey[];
  overflowCount: number;
  onPress: (date: DateData) => void;
};

export const CALENDAR_DAY_CELL_HEIGHT = 63;

export function CalendarDayCell({
  date,
  isSelected,
  isToday,
  markerColorKeys,
  overflowCount,
  onPress,
}: CalendarDayCellProps): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const themeColors = useThemeColors();

  const dayOfWeek = new Date(date.year, date.month - 1, date.day).getDay();
  const colorLabel = markerColorKeys
    .map((colorKey) => getColorLabel(colorKey, language))
    .join(", ");
  const accessibilityLabel = [
    formatLocal(date.dateString, "weekdayDate", language),
    isToday ? t("calendar.day.today") : null,
    isSelected ? t("calendar.day.selected") : null,
    colorLabel || null,
    overflowCount > 0
      ? t("calendar.day.overflow", { count: overflowCount })
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      accessibilityHint={t("calendar.day.selectHint")}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={4}
      onPress={() => {
        onPress(date);
      }}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
    >
      <View
        style={[
          styles.daySurface,
          isToday && styles.todaySurface,
          isToday && {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          },
          isSelected && { backgroundColor: themeColors.primary },
        ]}
      >
        <AppText
          style={[
            styles.dayLabel,
            { color: themeColors.text },
            dayOfWeek === 0 && { color: themeColors.red },
            dayOfWeek === 6 && { color: themeColors.blue },
            isToday && styles.todayLabel,
            isSelected && {
              color: themeColors.primaryForeground,
              fontWeight: "700",
            },
          ]}
        >
          {date.day}
        </AppText>
      </View>

      <View style={styles.markerStack}>
        {markerColorKeys.map((colorKey, index) => (
          <View
            key={`${colorKey}-${index}`}
            style={[
              styles.markerLine,
              { backgroundColor: colorByKey[colorKey].swatchColor },
              isSelected && styles.selectedMarker,
            ]}
          />
        ))}
      </View>
      <View style={styles.overflowSlot}>
        {overflowCount > 0 && (
          <AppText
            style={[styles.overflowLabel, { color: themeColors.textMuted }]}
          >
            +{overflowCount}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    height: CALENDAR_DAY_CELL_HEIGHT,
    justifyContent: "center",
    width: 42,
  },
  containerPressed: {
    opacity: 0.88,
  },
  dayLabel: {
    fontSize: typography.body,
    lineHeight: 20,
  },
  daySurface: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  markerLine: {
    borderRadius: borderRadius.pill,
    height: 3,
    width: "85%",
  },
  markerStack: {
    alignItems: "center",
    gap: 1,
    height: 19,
    justifyContent: "flex-end",
    marginTop: 4,
    width: "100%",
  },
  overflowLabel: {
    fontSize: 9,
    lineHeight: 9,
  },
  overflowSlot: {
    alignItems: "center",
    height: 9,
    justifyContent: "center",
    marginTop: 2,
  },
  selectedMarker: {
    opacity: 0.96,
  },
  todayLabel: {
    fontWeight: "600",
  },
  todaySurface: {
    borderWidth: 1,
  },
});
