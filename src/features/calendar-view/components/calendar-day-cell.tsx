import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { DateData } from "react-native-calendars";

import { AppText } from "~/design-system/components/app-text";
import { borderRadius, colors, typography } from "~/design-system/tokens";
import type { CalendarMarkerStatus } from "~/features/calendar-view/calendar-screen.helpers";

type CalendarDayCellProps = {
  date: DateData;
  isSelected: boolean;
  isToday: boolean;
  markerStatuses: CalendarMarkerStatus[];
  overflowCount: number;
  onPress: (date: DateData) => void;
};

const markerColorByStatus: Record<CalendarMarkerStatus, string> = {
  completed: colors.statusCompleted,
  overdue: colors.statusOverdue,
  scheduled: colors.statusScheduled,
  skipped: colors.statusSkipped,
};

const markerLabelByStatus: Record<CalendarMarkerStatus, string> = {
  completed: "완료",
  overdue: "놓침",
  scheduled: "예정",
  skipped: "건너뜀",
};

function CalendarDayCellComponent({
  date,
  isSelected,
  isToday,
  markerStatuses,
  overflowCount,
  onPress,
}: CalendarDayCellProps): React.JSX.Element {
  const dayOfWeek = new Date(date.year, date.month - 1, date.day).getDay();
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;
  const statusLabel = markerStatuses
    .map((status) => markerLabelByStatus[status])
    .join(", ");

  return (
    <Pressable
      accessibilityHint="선택 날짜를 바꿉니다."
      accessibilityLabel={`${date.month}월 ${date.day}일${isToday ? ", 오늘" : ""}${isSelected ? ", 선택됨" : ""}${statusLabel ? `, ${statusLabel}` : ""}`}
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

      <View style={styles.dotRow}>
        {markerStatuses.map((status, index) => (
          <View
            key={`${status}-${index}`}
            style={[
              styles.dot,
              { backgroundColor: markerColorByStatus[status] },
              isSelected && styles.selectedDot,
            ]}
          />
        ))}
        {overflowCount > 0 ? (
          <AppText style={styles.overflowLabel}>+{overflowCount}</AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

export const CalendarDayCell = memo(CalendarDayCellComponent);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    height: 42,
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
    color: colors.weekendSaturday,
  },
  dayLabelSunday: {
    color: colors.weekendSunday,
  },
  daySurface: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  dot: {
    borderRadius: borderRadius.pill,
    height: 4,
    width: 4,
  },
  dotRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 3,
    height: 10,
    justifyContent: "center",
    marginTop: 1,
  },
  overflowLabel: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 0,
    transform: [{ translateY: 2 }],
  },
  selectedLabel: {
    color: colors.primaryForeground,
    fontWeight: "700",
  },
  selectedDot: {
    opacity: 0.96,
  },
  selectedSurface: {
    backgroundColor: colors.primary,
  },
  todayLabel: {
    fontWeight: "600",
  },
  todaySurface: {
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.outlineSoft,
    borderWidth: 1,
  },
});
