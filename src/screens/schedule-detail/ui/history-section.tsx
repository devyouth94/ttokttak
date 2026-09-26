import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { formatInTimeZone } from "date-fns-tz";

import { useAppLanguage } from "~/i18n/provider";
import { formatLocal } from "~/schedule/display/date";
import { getActionLabel } from "~/schedule/display/label";
import type { OccurrenceLog } from "~/schedule/model";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing } from "~/ui/tokens";

type DetailHistorySectionProps = {
  logs: OccurrenceLog[];
  timezone: string;
};

export function DetailHistorySection({
  logs,
  timezone,
}: DetailHistorySectionProps): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const themeColors = useThemeColors();

  return (
    <View style={[styles.section, { backgroundColor: themeColors.surface }]}>
      <AppText style={{ color: themeColors.text }} variant="caption">
        {t("scheduleDetail.history.title")}
      </AppText>

      {logs.length === 0 && (
        <AppText
          style={[styles.empty, { color: themeColors.textMuted }]}
          variant="body3"
        >
          {t("scheduleDetail.history.empty")}
        </AppText>
      )}

      {logs.map((log, index) => {
        const actedDate = formatInTimeZone(
          log.actedAtUtc,
          timezone,
          "yyyy-MM-dd"
        );
        const scheduledDate = formatInTimeZone(
          log.scheduledAtUtc,
          timezone,
          "yyyy-MM-dd"
        );
        const isCompleted = log.action === "completed";

        return (
          <View
            key={log.id}
            style={[
              styles.row,
              index > 0 && {
                borderTopColor: themeColors.divider,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={styles.dateGroup}>
              <AppText style={{ color: themeColors.text }} variant="body3">
                {formatLocal(actedDate, "date", language)}
              </AppText>
              {actedDate !== scheduledDate && (
                <AppText
                  style={{ color: themeColors.textMuted }}
                  variant="label"
                >
                  {t("scheduleDetail.history.scheduledDate", {
                    date: formatLocal(scheduledDate, "date", language),
                  })}
                </AppText>
              )}
            </View>
            <View
              style={[
                styles.statusChip,
                {
                  backgroundColor: isCompleted
                    ? themeColors.greenSoft
                    : themeColors.graySoft,
                  borderColor: isCompleted
                    ? themeColors.greenBorder
                    : themeColors.grayBorder,
                },
              ]}
            >
              <AppText
                style={[
                  styles.statusText,
                  {
                    color: isCompleted
                      ? themeColors.greenText
                      : themeColors.grayText,
                  },
                ]}
                variant="label"
              >
                {getActionLabel(log.action, language)}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dateGroup: {
    flex: 1,
  },
  empty: {
    paddingVertical: spacing.xxs,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  section: {
    borderRadius: borderRadius.xl,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  statusChip: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minWidth: 56,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
  },
});
