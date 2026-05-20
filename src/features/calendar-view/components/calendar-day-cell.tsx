import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { DateData } from "react-native-calendars";

import { CALENDAR_MAX_VISIBLE_MARKERS } from "~/features/calendar-view/calendar-screen.helpers";
import { recurringItemColorOptionByKey } from "~/features/recurring/domain/color-palette";
import type { RecurringItemColorKey } from "~/features/recurring/domain/types";
import { AppText } from "~/shared/ui/app-text";
import { borderRadius, colors, typography } from "~/shared/ui/tokens";

type CalendarDayCellProps = {
  date: DateData;
  isSelected: boolean;
  isToday: boolean;
  markerColorKeys: RecurringItemColorKey[];
  overflowCount: number;
  onPress: (date: DateData) => void;
};

const cellMarkerLineGap = 1;
const cellMarkerLineHeight = 3;
const cellOverflowGap = 2;
const cellOverflowLabelHeight = 9;
const cellDaySurfaceSize = 28;
const cellMarkerTopGap = 4;
const cellMarkerStackHeight =
  CALENDAR_MAX_VISIBLE_MARKERS * cellMarkerLineHeight +
  (CALENDAR_MAX_VISIBLE_MARKERS - 1) * cellMarkerLineGap;
const cellMarkerAreaHeight =
  cellMarkerStackHeight + cellOverflowGap + cellOverflowLabelHeight;
export const CALENDAR_DAY_CELL_HEIGHT =
  cellDaySurfaceSize + cellMarkerTopGap + cellMarkerAreaHeight + 1;

function CalendarDayCellComponent({
  date,
  isSelected,
  isToday,
  markerColorKeys,
  overflowCount,
  onPress,
}: CalendarDayCellProps): React.JSX.Element {
  const dayOfWeek = new Date(date.year, date.month - 1, date.day).getDay();
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;
  const colorLabel = markerColorKeys
    .map((colorKey) => recurringItemColorOptionByKey[colorKey].label)
    .join(", ");
  const accessibilityLabels = [`${date.month}월 ${date.day}일`];

  if (isToday) {
    accessibilityLabels.push("오늘");
  }

  if (isSelected) {
    accessibilityLabels.push("선택됨");
  }

  if (colorLabel) {
    accessibilityLabels.push(colorLabel);
  }

  if (overflowCount > 0) {
    accessibilityLabels.push(`외 ${overflowCount}개`);
  }

  const accessibilityLabel = accessibilityLabels.join(", ");

  return (
    <Pressable
      accessibilityHint="선택 날짜를 바꿉니다."
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
          isSelected && styles.selectedSurface,
        ]}
      >
        <AppText
          style={[
            styles.dayLabel,
            isSunday && styles.dayLabelSunday,
            isSaturday && styles.dayLabelSaturday,
            isToday && styles.todayLabel,
            isSelected && styles.selectedLabel,
          ]}
        >
          {date.day}
        </AppText>
      </View>

      <View style={styles.markerArea}>
        <View style={styles.markerStack}>
          {markerColorKeys.map((colorKey, index) => (
            <CalendarColorMarker
              colorKey={colorKey}
              key={`${colorKey}-${index}`}
              isSelected={isSelected}
            />
          ))}
        </View>
        <View style={styles.overflowSlot}>
          {overflowCount > 0 ? (
            <AppText style={styles.overflowLabel}>+{overflowCount}</AppText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function CalendarColorMarker({
  colorKey,
  isSelected = false,
}: {
  colorKey: RecurringItemColorKey;
  isSelected?: boolean;
}): React.JSX.Element {
  const markerColor = recurringItemColorOptionByKey[colorKey].swatchColor;

  return (
    <View
      style={[
        styles.markerLine,
        { backgroundColor: markerColor },
        isSelected && styles.selectedMarker,
      ]}
    />
  );
}

export const CalendarDayCell = memo(CalendarDayCellComponent);

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
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 20,
  },
  dayLabelSaturday: {
    color: colors.blue,
  },
  dayLabelSunday: {
    color: colors.red,
  },
  daySurface: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    height: cellDaySurfaceSize,
    justifyContent: "center",
    width: cellDaySurfaceSize,
  },
  markerArea: {
    alignItems: "center",
    gap: cellOverflowGap,
    height: cellMarkerAreaHeight,
    justifyContent: "flex-start",
    marginTop: cellMarkerTopGap,
    width: "100%",
  },
  markerLine: {
    borderRadius: borderRadius.pill,
    height: cellMarkerLineHeight,
    width: "85%",
  },
  markerStack: {
    alignItems: "center",
    gap: cellMarkerLineGap,
    height: cellMarkerStackHeight,
    justifyContent: "flex-end",
    width: "100%",
  },
  overflowLabel: {
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 9,
    marginBottom: 0,
  },
  overflowSlot: {
    alignItems: "center",
    height: cellOverflowLabelHeight,
    justifyContent: "center",
  },
  selectedLabel: {
    color: colors.primaryForeground,
    fontWeight: "700",
  },
  selectedMarker: {
    opacity: 0.96,
  },
  selectedSurface: {
    backgroundColor: colors.primary,
  },
  todayLabel: {
    fontWeight: "600",
  },
  todaySurface: {
    backgroundColor: colors.surface,
    borderColor: colors.dividerOnPrimary,
    borderWidth: 1,
  },
});
