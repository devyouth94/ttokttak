import { useCallback, useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { startOfDay } from "date-fns";
import { Undo2 } from "lucide-react-native";

import { AppText } from "~/shared/ui/app-text";
import { borderRadius, colors, spacing } from "~/shared/ui/tokens";

import { createHomeDateOptions } from "./home-screen.helpers";

type HomeDateCarouselProps = {
  onSelectDate: (dateId: string) => void;
  selectedDateId: string;
};

export function HomeDateCarousel({
  onSelectDate,
  selectedDateId,
}: HomeDateCarouselProps): React.JSX.Element {
  const dateScrollRef = useRef<ScrollView>(null);
  const dateOptions = createHomeDateOptions(startOfDay(new Date()));
  const todayOption = dateOptions[0];
  const selectedDateOption =
    dateOptions.find((option) => option.id === selectedDateId) ?? todayOption;

  const scrollDateOptionsToStart = useCallback((): void => {
    dateScrollRef.current?.scrollTo({
      animated: true,
      x: 0,
      y: 0,
    });
  }, []);

  const selectToday = (): void => {
    onSelectDate(todayOption.id);
    scrollDateOptionsToStart();
  };

  useEffect(() => {
    if (selectedDateId === selectedDateOption.id) {
      return;
    }

    onSelectDate(todayOption.id);
  }, [onSelectDate, selectedDateId, selectedDateOption.id, todayOption.id]);

  useEffect(() => {
    if (!selectedDateOption.isToday) {
      return;
    }

    scrollDateOptionsToStart();
  }, [
    scrollDateOptionsToStart,
    selectedDateOption.id,
    selectedDateOption.isToday,
  ]);

  return (
    <View style={styles.carouselSection}>
      <View style={styles.dateSelectorRow}>
        <ScrollView
          contentContainerStyle={styles.carouselContent}
          horizontal
          ref={dateScrollRef}
          showsHorizontalScrollIndicator={false}
          style={styles.carouselScroll}
        >
          {dateOptions.map((option) => {
            const isSelected = option.id === selectedDateOption.id;
            const chipLabel = option.isToday ? "오늘" : option.dayLabel;

            return (
              <Pressable
                accessibilityHint={`${option.title} 기준으로 일정을 보여줘요.`}
                accessibilityLabel={`${option.title} 선택`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={option.id}
                onPress={() => {
                  onSelectDate(option.id);
                }}
                style={({ pressed }) => [
                  styles.dateChip,
                  isSelected && styles.dateChipSelected,
                  pressed && styles.dateChipPressed,
                ]}
              >
                <AppText
                  style={
                    isSelected
                      ? styles.dateChipLabelSelected
                      : styles.dateChipLabel
                  }
                  variant="caption"
                >
                  {chipLabel}
                </AppText>
                <AppText
                  style={
                    isSelected
                      ? styles.dateChipValueSelected
                      : styles.dateChipValue
                  }
                  variant="body"
                >
                  {option.value}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {!selectedDateOption.isToday ? (
          <Pressable
            accessibilityHint="오늘 기준 일정으로 돌아가요."
            accessibilityLabel="오늘로 돌아가기"
            accessibilityRole="button"
            onPress={selectToday}
            style={({ pressed }) => [
              styles.todayShortcutButton,
              pressed && styles.todayShortcutButtonPressed,
            ]}
          >
            <Undo2 color={colors.text} size={13} />
            <AppText style={styles.todayShortcutText} variant="caption">
              오늘로
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carouselContent: {
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  carouselScroll: {
    flex: 1,
    minWidth: 0,
  },
  carouselSection: {
    gap: spacing.md,
  },
  dateChip: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: colors.primary,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    height: 36,
    justifyContent: "center",
    minWidth: 52,
    paddingHorizontal: spacing.sm,
  },
  dateChipLabel: {
    color: colors.text,
  },
  dateChipLabelSelected: {
    color: colors.primaryForeground,
  },
  dateChipPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  dateChipSelected: {
    backgroundColor: colors.primary,
  },
  dateChipValue: {
    color: colors.text,
  },
  dateChipValueSelected: {
    color: colors.primaryForeground,
  },
  dateSelectorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  todayShortcutButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: colors.primary,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    flexShrink: 0,
    gap: 4,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  todayShortcutButtonPressed: {
    opacity: 0.88,
  },
  todayShortcutText: {
    color: colors.text,
  },
});
