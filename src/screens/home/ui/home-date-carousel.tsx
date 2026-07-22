import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { startOfDay } from "date-fns";
import { Undo2 } from "lucide-react-native";

import { useAppLanguage } from "~/shared/i18n";
import { AppText } from "~/shared/ui/app-text";
import { borderRadius, spacing } from "~/shared/ui/tokens";
import { useThemeColors } from "~/theme/context";

import { createHomeDateOptions } from "../model/home-feed-sections";

type HomeDateCarouselProps = {
  onSelectDate: (dateId: string) => void;
  selectedDateId: string;
};

export function HomeDateCarousel({
  onSelectDate,
  selectedDateId,
}: HomeDateCarouselProps): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const themeColors = useThemeColors();
  const dateScrollRef = useRef<ScrollView>(null);
  const dateOptions = createHomeDateOptions(startOfDay(new Date()), language);
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
            const chipLabel = option.isToday
              ? t("home.date.today")
              : option.dayLabel;

            return (
              <Pressable
                accessibilityHint={t("home.date.optionHint", {
                  date: option.title,
                })}
                accessibilityLabel={t("home.date.optionLabel", {
                  date: option.title,
                })}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={option.id}
                onPress={() => {
                  onSelectDate(option.id);
                }}
                style={({ pressed }) => [
                  styles.dateChip,
                  { borderColor: themeColors.primary },
                  isSelected && { backgroundColor: themeColors.primary },
                  pressed && styles.dateChipPressed,
                ]}
              >
                <AppText
                  style={
                    isSelected
                      ? { color: themeColors.primaryForeground }
                      : { color: themeColors.text }
                  }
                  variant="caption"
                >
                  {chipLabel}
                </AppText>
                <AppText
                  style={
                    isSelected
                      ? { color: themeColors.primaryForeground }
                      : { color: themeColors.text }
                  }
                  variant="body"
                >
                  {option.value}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {!selectedDateOption.isToday && (
          <Pressable
            accessibilityHint={t("home.date.returnTodayHint")}
            accessibilityLabel={t("home.date.returnTodayLabel")}
            accessibilityRole="button"
            onPress={selectToday}
            style={({ pressed }) => [
              styles.todayShortcutButton,
              { borderColor: themeColors.primary },
              pressed && styles.todayShortcutButtonPressed,
            ]}
          >
            <Undo2 color={themeColors.text} size={13} />
            <AppText style={{ color: themeColors.text }} variant="caption">
              {t("home.date.returnTodayShort")}
            </AppText>
          </Pressable>
        )}
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
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    height: 36,
    justifyContent: "center",
    minWidth: 52,
    paddingHorizontal: spacing.sm,
  },
  dateChipPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  dateSelectorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  todayShortcutButton: {
    alignItems: "center",
    backgroundColor: "transparent",
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
});
