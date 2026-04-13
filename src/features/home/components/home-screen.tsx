import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, Bell } from "lucide-react-native";

import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import { borderRadius, colors, spacing } from "~/design-system/tokens";
import { useSession } from "~/features/session/session-provider";

const HOME_DATE_RANGE_DAYS = 31;
type HomeDateOption = {
  dayLabel: string;
  id: string;
  isToday: boolean;
  title: string;
  value: string;
};

function getProfileName(
  profile: ReturnType<typeof useSession>["profile"]
): string {
  if (profile?.display_name?.trim()) {
    return profile.display_name.trim();
  }

  return "사용자";
}

function createHomeDateOptions(today: Date): HomeDateOption[] {
  return Array.from({ length: HOME_DATE_RANGE_DAYS }, (_, index) => {
    const date = addDays(today, index);
    const id = format(date, "yyyy-MM-dd");

    return {
      dayLabel: format(date, "EEE", { locale: ko }),
      id,
      isToday: index === 0,
      title: isSameDay(date, today)
        ? "오늘"
        : format(date, "M월 d일", { locale: ko }),
      value: format(date, "d"),
    };
  });
}

export function HomeScreen(): React.JSX.Element {
  const { profile } = useSession();
  const [selectedDateId, setSelectedDateId] = useState(() =>
    format(startOfDay(new Date()), "yyyy-MM-dd")
  );
  const dateScrollRef = useRef<ScrollView>(null);

  const profileName = getProfileName(profile);
  const today = startOfDay(new Date());
  const dateOptions = createHomeDateOptions(today);
  const selectedDateOption =
    dateOptions.find((option) => option.id === selectedDateId) ??
    dateOptions[0];
  const showsTodayFeed = selectedDateOption.isToday;
  const visibleSections = showsTodayFeed
    ? ["Overdue", selectedDateOption.title, "Upcoming"]
    : [selectedDateOption.title];

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <View style={styles.screenRoot}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <AppText style={styles.title} variant="title">
                {"안녕하세요, "}
                {profileName}
                {"님"}
              </AppText>
            </View>

            <View style={styles.headerAction}>
              <Pressable
                accessibilityHint="알림 화면으로 이동합니다."
                accessibilityLabel="알림 열기"
                accessibilityRole="button"
                onPress={() => {
                  router.push("/(tabs)/home/notifications");
                }}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.iconButtonPressed,
                ]}
              >
                <Bell color={colors.text} size={20} />
              </Pressable>
            </View>
          </View>

          <View style={styles.carouselSection}>
            <ScrollView
              contentContainerStyle={styles.carouselContent}
              horizontal
              ref={dateScrollRef}
              showsHorizontalScrollIndicator={false}
            >
              {dateOptions.map((option) => {
                const isSelected = option.id === selectedDateOption.id;

                return (
                  <Pressable
                    accessibilityHint={`${option.title} 일정 기준으로 홈 피드를 바꿉니다.`}
                    accessibilityLabel={`${option.title} 선택`}
                    accessibilityRole="button"
                    key={option.id}
                    onPress={() => {
                      setSelectedDateId(option.id);
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
                      variant="label"
                    >
                      {option.dayLabel}
                    </AppText>
                    <AppText
                      style={
                        isSelected
                          ? styles.dateChipValueSelected
                          : styles.dateChipValue
                      }
                      variant="title"
                    >
                      {option.value}
                    </AppText>
                    {option.isToday ? (
                      <View
                        style={[
                          styles.todayDot,
                          isSelected && styles.todayDotSelected,
                        ]}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            {!showsTodayFeed ? (
              <Pressable
                accessibilityHint="오늘 기준 홈 피드로 즉시 돌아갑니다."
                accessibilityLabel="오늘로 돌아가기"
                accessibilityRole="button"
                onPress={() => {
                  setSelectedDateId(dateOptions[0].id);
                  dateScrollRef.current?.scrollTo({
                    animated: true,
                    x: 0,
                    y: 0,
                  });
                }}
                style={({ pressed }) => [
                  styles.todayShortcutButton,
                  pressed && styles.todayShortcutButtonPressed,
                ]}
              >
                <View style={styles.todayShortcutIcon}>
                  <ArrowLeft color={colors.secondaryForeground} size={14} />
                </View>
                <AppText style={styles.todayShortcutText}>
                  오늘로 돌아가기
                </AppText>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.previewCard}>
            <AppText variant="label">카드 섹션 기준</AppText>
            <AppText style={styles.previewTitle} variant="title">
              {selectedDateOption.title}
            </AppText>
            <AppText style={styles.previewDescription}>
              {showsTodayFeed
                ? "오늘을 선택한 상태라서 overdue와 upcoming이 함께 보입니다."
                : "선택한 날짜의 예정된 일정만 카드 섹션에 노출됩니다."}
            </AppText>
            <View style={styles.sectionTagList}>
              {visibleSections.map((section) => (
                <View key={section} style={styles.sectionTag}>
                  <AppText style={styles.sectionTagText}>{section}</AppText>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  carouselContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  carouselSection: {
    gap: spacing.md,
  },
  contentContainer: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  dateChip: {
    alignItems: "center",
    backgroundColor: colors.surfaceHigh,
    borderRadius: borderRadius.pill,
    justifyContent: "center",
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: "relative",
    width: 56,
  },
  dateChipLabel: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  dateChipLabelSelected: {
    color: colors.primaryForeground,
    marginBottom: spacing.xs,
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
    fontSize: 20,
    lineHeight: 24,
  },
  dateChipValueSelected: {
    color: colors.primaryForeground,
    fontSize: 20,
    lineHeight: 24,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 60,
    justifyContent: "space-between",
    width: "100%",
  },
  headerAction: {
    alignItems: "flex-end",
    position: "relative",
    zIndex: 20,
  },
  headerCopy: {
    flex: 1,
  },
  iconButton: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  iconButtonPressed: {
    opacity: 0.88,
  },
  previewCard: {
    backgroundColor: colors.surfaceLow,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  previewDescription: {
    color: colors.textMuted,
  },
  previewTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  screenContent: {
    paddingHorizontal: spacing.lg,
    position: "relative",
  },
  screenRoot: {
    flex: 1,
  },
  sectionTag: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionTagList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTagText: {
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    textAlign: "left",
  },
  todayDot: {
    backgroundColor: colors.primary,
    bottom: 8,
    borderRadius: borderRadius.pill,
    height: 6,
    position: "absolute",
    width: 6,
  },
  todayDotSelected: {
    backgroundColor: colors.primaryForeground,
  },
  todayShortcutButton: {
    alignSelf: "flex-end",
    alignItems: "center",
    borderRadius: borderRadius.pill,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  todayShortcutButtonPressed: {
    opacity: 0.88,
  },
  todayShortcutIcon: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  todayShortcutText: {
    color: colors.secondaryForeground,
    fontSize: 14,
    lineHeight: 20,
  },
});
