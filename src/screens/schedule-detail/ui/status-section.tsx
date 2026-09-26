import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { differenceInCalendarDays } from "date-fns/differenceInCalendarDays";
import { parseISO } from "date-fns/parseISO";
import { formatInTimeZone } from "date-fns-tz";

import { useAppLanguage } from "~/i18n/provider";
import { formatTimestamp } from "~/schedule/display/date";
import { getActionLabel } from "~/schedule/display/label";
import type { Occurrence } from "~/schedule/model";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing } from "~/ui/tokens";

type DetailStatusSectionProps = {
  isEntryOccurrence: boolean;
  now: Date;
  occurrence: Occurrence | null;
  overdueCount: number;
  timezone: string;
};

export function DetailStatusSection({
  isEntryOccurrence,
  now,
  occurrence,
  overdueCount,
  timezone,
}: DetailStatusSectionProps): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const themeColors = useThemeColors();

  function getTitle(): string {
    if (!occurrence) {
      return t("scheduleDetail.status.noUpcomingTitle");
    }

    if (isEntryOccurrence) {
      return t(`scheduleDetail.status.${occurrence.status}`);
    }

    if (occurrence.status === "overdue") {
      return t("scheduleDetail.status.overdue");
    }

    return t("scheduleDetail.status.nextItem");
  }

  function getMetaLabel(): string {
    if (!occurrence) {
      return t("scheduleDetail.status.noFollowingItem");
    }

    const processedEntryAction =
      isEntryOccurrence &&
      (occurrence.status === "completed" || occurrence.status === "skipped")
        ? occurrence.status
        : null;

    // 상세 진입 맥락이면 전체 지난 일정 요약보다 해당 occurrence 상태를 우선한다.
    if (processedEntryAction) {
      return getActionLabel(processedEntryAction, language);
    }

    const dayDifference = differenceInCalendarDays(
      parseISO(occurrence.localDate),
      parseISO(formatInTimeZone(now, timezone, "yyyy-MM-dd"))
    );
    const isOverdueSummary =
      occurrence.status === "overdue" && !isEntryOccurrence && overdueCount > 1;

    if (isOverdueSummary) {
      return t("scheduleDetail.status.overdueCount", {
        count: overdueCount,
      });
    }

    if (occurrence.status === "overdue") {
      const overdueDays = Math.max(0, -dayDifference);

      if (overdueDays === 0) {
        return t("scheduleDetail.status.today");
      }

      return t("scheduleDetail.status.overdueDays", {
        count: overdueDays,
      });
    }

    if (dayDifference === 0) {
      return t("scheduleDetail.status.today");
    }

    if (dayDifference === 1) {
      return t("scheduleDetail.status.tomorrow");
    }

    return t("scheduleDetail.status.inDays", {
      count: dayDifference,
    });
  }

  const title = getTitle();
  const dateLabel = occurrence
    ? formatTimestamp(occurrence.scheduledAtUtc, timezone, "date", language)
    : t("scheduleDetail.status.noUpcomingDate");
  const timeLabel = occurrence
    ? formatTimestamp(occurrence.scheduledAtUtc, timezone, "time", language)
    : null;
  const metaLabel = getMetaLabel();

  return (
    <View style={[styles.section, { backgroundColor: themeColors.primary }]}>
      <AppText
        style={{ color: themeColors.primaryForeground }}
        variant="caption"
      >
        {title}
      </AppText>
      <AppText
        style={[styles.date, { color: themeColors.primaryForeground }]}
        variant="title"
      >
        {dateLabel}
      </AppText>
      <AppText
        style={[styles.meta, { color: themeColors.primaryForeground }]}
        variant="body3"
      >
        {[metaLabel, timeLabel].filter(Boolean).join(" ")}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  date: {
    textAlign: "left",
  },
  meta: {
    flexShrink: 1,
  },
  section: {
    alignItems: "flex-start",
    borderRadius: borderRadius.xl,
    gap: spacing.xxs,
    padding: spacing.md,
  },
});
