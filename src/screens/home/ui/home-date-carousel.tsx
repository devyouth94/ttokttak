import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { addDays } from "date-fns/addDays";
import { format } from "date-fns/format";
import { startOfDay } from "date-fns/startOfDay";
import { Undo2 } from "lucide-react-native";

import type { AppLanguage } from "~/i18n/language";
import { useAppLanguage } from "~/i18n/provider";
import { formatLocal } from "~/schedule/display/date";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing } from "~/ui/tokens";

const DATE_RANGE_DAYS = 15;

type HomeDateCarouselProps = {
  onSelectDate: (dateId: string) => void;
  selectedDateId: string;
};

/** 오늘부터 15일을 선택할 수 있는 홈 날짜 캐러셀을 표시한다. */
export function HomeDateCarousel({
  onSelectDate,
  selectedDateId,
}: HomeDateCarouselProps): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const themeColors = useThemeColors();
  const dateScrollRef = useRef<ScrollView>(null);
  const dateOptions = createHomeDateOptions(
    startOfDay(new Date()),
    language,
    t("home.date.today")
  );
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
    // 조회 범위 밖의 날짜가 남으면 화면과 실제 선택 항목이 어긋난다.
    if (selectedDateId === selectedDateOption.id) {
      return;
    }

    onSelectDate(todayOption.id);
  }, [onSelectDate, selectedDateId, selectedDateOption.id, todayOption.id]);

  useEffect(() => {
    // 오늘로 돌아올 때 오늘 칩도 함께 첫 위치로 되돌린다.
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
    <View style={styles.root}>
      <View style={styles.row}>
        <ScrollView
          contentContainerStyle={styles.content}
          horizontal
          ref={dateScrollRef}
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}
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
                  styles.chip,
                  { borderColor: themeColors.primary },
                  isSelected && { backgroundColor: themeColors.primary },
                  pressed && styles.chipPressed,
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
              styles.todayButton,
              { borderColor: themeColors.primary },
              pressed && styles.todayButtonPressed,
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

/** 오늘을 시작으로 홈 날짜 선택 항목 15개를 만든다. */
export function createHomeDateOptions(
  today: Date,
  language: AppLanguage,
  todayTitle: string
) {
  return Array.from({ length: DATE_RANGE_DAYS }, (_, index) => {
    const id = format(addDays(today, index), "yyyy-MM-dd");

    return {
      dayLabel: formatLocal(id, "weekday", language),
      id,
      isToday: index === 0,
      title: index === 0 ? todayTitle : formatLocal(id, "date", language),
      value: formatLocal(id, "day", language),
    };
  });
}

const styles = StyleSheet.create({
  chip: {
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
  chipPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  content: {
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  root: {
    gap: spacing.md,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  scroll: {
    flex: 1,
    minWidth: 0,
  },
  todayButton: {
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
  todayButtonPressed: {
    opacity: 0.88,
  },
});
