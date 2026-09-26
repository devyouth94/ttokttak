import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Bell, BellOff } from "lucide-react-native";

import { useAppLanguage } from "~/i18n/provider";
import { getColorHexLabel } from "~/schedule/display/color";
import { formatLocal } from "~/schedule/display/date";
import {
  getRecurrenceLabel,
  getScheduleDisplayTitle,
} from "~/schedule/display/label";
import { currentRule, type Schedule } from "~/schedule/model";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { StateMessage } from "~/ui/state-message";
import { borderRadius, spacing, typography } from "~/ui/tokens";

export function DetailSummarySection({
  item,
}: {
  item: Schedule;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const themeColors = useThemeColors();

  const rule = currentRule(item);

  const NotificationIcon = rule.notificationsEnabled ? Bell : BellOff;
  const notificationLabel = formatLocal(
    rule.reminderTimeLocal,
    "time",
    language
  );
  const notificationStatusLabel = rule.notificationsEnabled
    ? t("scheduleDetail.summary.notificationEnabled")
    : t("scheduleDetail.summary.notificationDisabled");
  const colorLabel = getColorHexLabel(item.colorHex, language);
  const title = getScheduleDisplayTitle(
    item,
    t("schedule.contentUnavailableTitle")
  );

  return (
    <>
      {item.contentStatus === "unrecoverable" && (
        <StateMessage
          description={t("scheduleDetail.contentRecovery.description")}
          style={styles.recovery}
          title={t("scheduleDetail.contentRecovery.title")}
        />
      )}

      <View style={styles.section}>
        <AppText
          style={[styles.title, { color: themeColors.text }]}
          variant="title"
        >
          {title}
        </AppText>

        <View style={styles.badgeStack}>
          <View style={styles.outlineGroup}>
            <SummaryOutlineRow
              label={t("scheduleDetail.summary.recurrence")}
              value={getRecurrenceLabel(item, language)}
            />

            <SummaryOutlineRow
              accessibilityLabel={t("scheduleDetail.summary.notificationA11y", {
                label: notificationLabel,
                status: notificationStatusLabel,
              })}
              label={t("scheduleDetail.summary.notification")}
              trailingIcon={
                <View style={styles.notificationIconSlot}>
                  <NotificationIcon
                    absoluteStrokeWidth
                    color={themeColors.text}
                    size={14}
                    strokeWidth={1.2}
                  />
                </View>
              }
              value={notificationLabel}
            />
          </View>

          <View style={styles.outlineGroup}>
            <SummaryOutlineRow
              label={t("scheduleDetail.summary.startDate")}
              value={formatLocal(item.startDateLocal, "fullDate", language)}
            />
            {rule.endDateLocal && (
              <SummaryOutlineRow
                label={t("scheduleDetail.summary.endDate")}
                value={formatLocal(rule.endDateLocal, "fullDate", language)}
              />
            )}
            <SummaryOutlineRow
              accessibilityLabel={t("scheduleDetail.summary.itemColorA11y", {
                color: colorLabel,
              })}
              label={t("scheduleDetail.summary.itemColor")}
              trailingIcon={
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={[
                    styles.colorMarker,
                    {
                      backgroundColor: item.colorHex,
                    },
                  ]}
                />
              }
            />
          </View>

          {rule.anchorType === "completion_based" && (
            <View style={styles.outlineGroup}>
              <SummaryOutlineRow
                label={t("scheduleDetail.summary.anchorType")}
                value={t("scheduleDetail.summary.completionBased")}
              />
            </View>
          )}
        </View>
      </View>
    </>
  );
}

type SummaryOutlineRowProps = {
  accessibilityLabel?: string;
  label: string;
  trailingIcon?: ReactNode;
  value?: string;
};

function SummaryOutlineRow({
  accessibilityLabel,
  label,
  trailingIcon,
  value,
}: SummaryOutlineRowProps): React.JSX.Element {
  const themeColors = useThemeColors();

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={[styles.outlineRow, { borderColor: themeColors.primary }]}
    >
      <AppText style={{ color: themeColors.text }} variant="caption">
        {label}
      </AppText>
      <View style={styles.outlineContent}>
        {value && (
          <AppText
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.outlineValue, { color: themeColors.text }]}
            variant="body3"
          >
            {value}
          </AppText>
        )}
        {trailingIcon}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeStack: {
    alignItems: "center",
    gap: spacing.xxs,
    maxWidth: "100%",
  },
  colorMarker: {
    borderRadius: borderRadius.pill,
    height: 12,
    width: 12,
  },
  notificationIconSlot: {
    alignItems: "center",
    height: typography.lineHeight.body,
    justifyContent: "center",
    width: 14,
  },
  outlineContent: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 4,
    minWidth: 0,
  },
  outlineGroup: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xxs,
    justifyContent: "center",
    maxWidth: "100%",
  },
  outlineRow: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xxs,
    maxWidth: "100%",
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  outlineValue: {
    flexShrink: 1,
  },
  recovery: {
    flex: 0,
    minHeight: 96,
  },
  section: {
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  title: {
    textAlign: "center",
  },
});
