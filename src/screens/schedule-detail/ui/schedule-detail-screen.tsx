import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import * as DropdownMenu from "@rn-primitives/dropdown-menu";
import { Bell, BellOff, EllipsisVertical } from "lucide-react-native";

import { getErrorMessage } from "~/errors";
import { useAppLanguage } from "~/i18n/provider";
import { useNotifications } from "~/notifications/provider";
import { getScheduleReturnPath } from "~/route-param";
import {
  colorByKey,
  type ColorKey,
  getColorLabel,
} from "~/schedule/display/color";
import { archiveSchedule } from "~/schedule/write";
import { useThemeColors } from "~/theme/provider";
import { AppScreen } from "~/ui/app-screen";
import { AppText } from "~/ui/app-text";
import { FocusScreenHeader } from "~/ui/focus-screen-header";
import { StateMessage } from "~/ui/state-message";
import { spacing } from "~/ui/tokens";

import { useScheduleDetailScreenStyles } from "./schedule-detail-screen.styles";
import {
  buildOccurrenceStatusCard,
  buildRecurringItemDetailViewModel,
  type ItemDetailHistoryEntry,
  type ItemDetailSummaryBadge,
} from "../model/schedule-detail-model";
import { useDetailQuery } from "../query";

const DETAIL_PLACEHOLDER_HISTORY_ROW_COUNT = 3;
const ITEM_NOT_FOUND_MESSAGE = "반복 항목을 찾을 수 없습니다.";

function DetailScheduleSection({
  dateLabel,
  metaLabel,
  timeLabel,
  title,
}: {
  dateLabel: string;
  metaLabel: string;
  timeLabel: string | null;
  title: string;
}): React.JSX.Element {
  const styles = useScheduleDetailScreenStyles();

  return (
    <View style={styles.scheduleSection}>
      <AppText style={styles.scheduleTitle} variant="caption">
        {title}
      </AppText>
      <AppText style={styles.scheduleDate} variant="title">
        {dateLabel}
      </AppText>
      <AppText style={styles.scheduleMetaText} variant="body3">
        {[metaLabel, timeLabel].filter(Boolean).join(" ")}
      </AppText>
    </View>
  );
}

function DetailSummarySection({
  colorKey,
  notificationLabel,
  notificationsEnabled,
  recurrenceLabel,
  settingBadges,
  title,
}: {
  colorKey: ColorKey;
  notificationLabel: string;
  notificationsEnabled: boolean;
  recurrenceLabel: string;
  settingBadges: ItemDetailSummaryBadge[];
  title: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const styles = useScheduleDetailScreenStyles();
  const themeColors = useThemeColors();
  const NotificationIcon = notificationsEnabled ? Bell : BellOff;
  const colorOption = colorByKey[colorKey];
  const colorLabel = getColorLabel(colorKey, language);
  const notificationStatusLabel = notificationsEnabled
    ? t("scheduleDetail.summary.notificationEnabled")
    : t("scheduleDetail.summary.notificationDisabled");
  const scheduleBadges = settingBadges.filter((badge) =>
    ["end-date", "start-date"].includes(badge.id)
  );
  const extraBadges = settingBadges.filter(
    (badge) => !["end-date", "start-date"].includes(badge.id)
  );

  return (
    <View style={styles.summarySection}>
      <AppText style={styles.summaryTitle} variant="title">
        {title}
      </AppText>

      <View style={styles.summaryBadgeStack}>
        <View style={styles.summaryOutlineGroup}>
          <DetailSummaryOutlineRow
            label={t("scheduleDetail.summary.recurrence")}
            value={recurrenceLabel}
          />

          <DetailSummaryOutlineRow
            accessibilityLabel={t("scheduleDetail.summary.notificationA11y", {
              label: notificationLabel,
              status: notificationStatusLabel,
            })}
            label={t("scheduleDetail.summary.notification")}
            trailingIcon={
              <View style={styles.summaryNotificationIconSlot}>
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

        <View style={styles.summaryOutlineGroup}>
          {scheduleBadges.map((badge) => (
            <DetailSummaryOutlineRow
              key={badge.id}
              label={badge.label}
              value={badge.value}
            />
          ))}
          <DetailSummaryColorRow
            colorLabel={colorLabel}
            swatchColor={colorOption.swatchColor}
          />
        </View>

        {extraBadges.length > 0 && (
          <View style={styles.summaryOutlineGroup}>
            {extraBadges.map((badge) => (
              <DetailSummaryOutlineRow
                key={badge.id}
                label={badge.label}
                value={badge.value}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function DetailSummaryColorRow({
  colorLabel,
  swatchColor,
}: {
  colorLabel: string;
  swatchColor: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useScheduleDetailScreenStyles();

  return (
    <View
      accessibilityLabel={t("scheduleDetail.summary.itemColorA11y", {
        color: colorLabel,
      })}
      accessible
      style={styles.summaryOutlineRow}
    >
      <AppText style={styles.summaryOutlineLabel} variant="caption">
        {t("scheduleDetail.summary.itemColor")}
      </AppText>
      <View style={styles.summaryOutlineContent}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.summaryColorMarker, { backgroundColor: swatchColor }]}
        />
      </View>
    </View>
  );
}

function DetailSummaryOutlineRow({
  accessibilityLabel,
  label,
  trailingIcon,
  value,
}: {
  accessibilityLabel?: string;
  label: string;
  trailingIcon?: ReactNode;
  value: string;
}): React.JSX.Element {
  const styles = useScheduleDetailScreenStyles();

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={styles.summaryOutlineRow}
    >
      <AppText style={styles.summaryOutlineLabel} variant="caption">
        {label}
      </AppText>
      <View style={styles.summaryOutlineContent}>
        <AppText
          ellipsizeMode="tail"
          numberOfLines={1}
          style={styles.summaryOutlineValue}
          variant="body3"
        >
          {value}
        </AppText>
        {trailingIcon}
      </View>
    </View>
  );
}

function DetailLoadingPlaceholder(): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useScheduleDetailScreenStyles();

  return (
    <View
      accessibilityLabel={t("scheduleDetail.loadingA11yLabel")}
      accessibilityRole="progressbar"
      style={styles.detailPlaceholder}
    >
      <View style={styles.loadingSummarySection}>
        <View style={styles.loadingSummaryTitle} />

        <View style={styles.loadingBadgeStack}>
          <View style={styles.loadingBadgeGroup}>
            <View style={[styles.loadingBadge, styles.loadingBadgeMedium]} />
            <View style={[styles.loadingBadge, styles.loadingBadgeLong]} />
          </View>

          <View style={styles.loadingBadgeGroup}>
            <View style={[styles.loadingBadge, styles.loadingBadgeLong]} />
            <View style={[styles.loadingBadge, styles.loadingBadgeShort]} />
          </View>
        </View>
      </View>

      <View style={styles.loadingScheduleSection}>
        <View style={styles.loadingScheduleLabel} />
        <View style={styles.loadingScheduleDate} />
        <View style={styles.loadingScheduleMeta} />
      </View>

      <View style={styles.loadingHistorySection}>
        <View style={styles.loadingHistoryLabel} />
        {Array.from({ length: DETAIL_PLACEHOLDER_HISTORY_ROW_COUNT }).map(
          (_, index) => (
            <View
              key={index}
              style={[
                styles.loadingHistoryRow,
                index > 0 ? styles.loadingHistoryDivider : undefined,
              ]}
            >
              <View style={styles.loadingHistoryDate} />
              <View style={styles.loadingHistoryStatus} />
            </View>
          )
        )}
      </View>
    </View>
  );
}

function DetailError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <StateMessage
      action={{
        accessibilityHint: t("scheduleDetail.error.retryHint"),
        accessibilityLabel: t("scheduleDetail.error.retryLabel"),
        label: t("scheduleDetail.error.retryLabel"),
        onPress: onRetry,
      }}
      description={message}
      style={{ flex: 0, minHeight: 120 }}
      title={t("scheduleDetail.error.title")}
    />
  );
}

function DetailInlineError({
  message,
  title,
}: {
  message: string;
  title?: string;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <StateMessage
      description={message}
      style={{ flex: 0, minHeight: 96 }}
      title={title ?? t("scheduleDetail.inlineErrorTitle")}
    />
  );
}

function DetailHistorySection({
  entries,
}: {
  entries: ItemDetailHistoryEntry[];
}): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useScheduleDetailScreenStyles();

  return (
    <View style={styles.historySection}>
      <AppText style={styles.historySectionLabel} variant="caption">
        {t("scheduleDetail.history.title")}
      </AppText>

      <View>
        {entries.length > 0 ? (
          entries.map((entry, index) => (
            <DetailHistoryCard
              entry={entry}
              isFirst={index === 0}
              key={entry.id}
            />
          ))
        ) : (
          <AppText style={styles.historyEmptyText} variant="body3">
            {t("scheduleDetail.history.empty")}
          </AppText>
        )}
      </View>
    </View>
  );
}

function DetailHistoryCard({
  entry,
  isFirst,
}: {
  entry: ItemDetailHistoryEntry;
  isFirst: boolean;
}): React.JSX.Element {
  const styles = useScheduleDetailScreenStyles();
  const isCompleted = entry.action === "completed";
  const statusChipStyle = isCompleted
    ? styles.historyStatusChipCompleted
    : styles.historyStatusChipSkipped;
  const statusChipTextStyle = isCompleted
    ? styles.historyStatusChipTextCompleted
    : styles.historyStatusChipTextSkipped;

  return (
    <View style={[styles.historyRow, !isFirst && styles.historyRowDivider]}>
      <View style={styles.historyDateGroup}>
        <AppText style={styles.historyDate} variant="body3">
          {entry.actedDateLabel}
        </AppText>
        {entry.scheduledDateLabel && (
          <AppText style={styles.historyScheduledDate} variant="label">
            {entry.scheduledDateLabel}
          </AppText>
        )}
      </View>
      <View style={[styles.historyStatusChip, statusChipStyle]}>
        <AppText
          style={[styles.historyStatusChipText, statusChipTextStyle]}
          variant="label"
        >
          {entry.statusLabel}
        </AppText>
      </View>
    </View>
  );
}

function DetailNotFound(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <StateMessage
      action={{
        accessibilityHint: t("scheduleDetail.notFound.homeHint"),
        accessibilityLabel: t("scheduleDetail.notFound.homeLabel"),
        label: t("scheduleDetail.notFound.homeLabel"),
        onPress: () => {
          router.replace("/");
        },
      }}
      description={t("scheduleDetail.notFound.description")}
      style={{ flex: 0, minHeight: 120 }}
      title={t("scheduleDetail.notFound.title")}
    />
  );
}

export function ScheduleDetailScreen({
  itemId,
  returnTo,
  scheduledAtUtc,
}: {
  itemId?: string;
  returnTo?: string;
  scheduledAtUtc?: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const { syncNotifications } = useNotifications();
  const styles = useScheduleDetailScreenStyles();
  const themeColors = useThemeColors();
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(
    null
  );
  const [isArchiving, setIsArchiving] = useState(false);

  const now = new Date();
  const detailQuery = useDetailQuery({
    itemId: itemId ?? null,
    now,
    scheduledAtUtc,
  });
  const { timezone, userId } = detailQuery;
  const isLoading = detailQuery.isLoading;
  const queryErrorMessage = !itemId
    ? t("scheduleDetail.error.missingPath")
    : detailQuery.error
      ? getErrorMessage(detailQuery.error)
      : null;

  const { basisOccurrence, completionLogs, item } = detailQuery;
  const viewModel = item
    ? buildRecurringItemDetailViewModel({
        completionLogs,
        item,
        language,
        nextOccurrence: detailQuery.nextOccurrence,
        now,
        overdueOccurrences: detailQuery.overdueOccurrences,
        timezone,
      })
    : null;
  const statusCard =
    basisOccurrence && scheduledAtUtc
      ? buildOccurrenceStatusCard({
          now,
          occurrence: basisOccurrence,
          language,
          timezone,
        })
      : viewModel?.statusCard;
  const isMutating = isArchiving;
  const isContentUnrecoverable = item?.contentStatus === "unrecoverable";
  const isNotFound =
    !item &&
    !isLoading &&
    (queryErrorMessage === ITEM_NOT_FOUND_MESSAGE ||
      queryErrorMessage === null);
  const scrollBottomPadding = spacing.lg;

  const refetchDetail = async (): Promise<void> => {
    await detailQuery.refetch();
  };

  const handleRetry = (): void => {
    setActionErrorMessage(null);
    void refetchDetail();
  };

  const handleEdit = (): void => {
    if (!itemId || isMutating) {
      return;
    }

    router.push({
      params: {
        itemId,
        ...(returnTo ? { returnTo } : {}),
      },
      pathname: "/items/[itemId]/edit",
    });
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!item || !userId || isMutating) {
      return;
    }

    setActionErrorMessage(null);
    setIsArchiving(true);

    try {
      await archiveSchedule({
        itemId: item.id,
        syncNotifications,
      });

      router.replace(getScheduleReturnPath(returnTo));
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error));
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = (): void => {
    if (!item || !userId || isMutating) {
      return;
    }

    Alert.alert(
      t("scheduleDetail.deleteAlert.title"),
      t("scheduleDetail.deleteAlert.message"),
      [
        {
          style: "cancel",
          text: t("scheduleDetail.deleteAlert.cancel"),
        },
        {
          style: "destructive",
          text: t("scheduleDetail.deleteAlert.confirm"),
          onPress: () => {
            void handleDeleteConfirm();
          },
        },
      ]
    );
  };

  return (
    <AppScreen>
      <View style={styles.screenRoot}>
        <FocusScreenHeader
          onBack={() => {
            router.back();
          }}
          rightSlot={
            item &&
            !queryErrorMessage && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Pressable
                    accessibilityHint={t("scheduleDetail.management.menuHint")}
                    accessibilityLabel={t(
                      "scheduleDetail.management.menuLabel"
                    )}
                    accessibilityRole="button"
                    disabled={isMutating}
                    style={({ pressed }) => [
                      styles.managementMenuButton,
                      isMutating && styles.managementMenuButtonDisabled,
                      pressed &&
                        !isMutating &&
                        styles.managementMenuButtonPressed,
                    ]}
                  >
                    <EllipsisVertical color={themeColors.text} size={20} />
                  </Pressable>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Overlay
                    closeOnPress
                    style={StyleSheet.absoluteFill}
                  />
                  <DropdownMenu.Content
                    align="end"
                    avoidCollisions
                    insets={{
                      bottom: spacing.lg,
                      left: spacing.md,
                      right: spacing.md,
                      top: spacing.lg,
                    }}
                    side="bottom"
                    sideOffset={2}
                    style={styles.managementMenuContent}
                  >
                    {!isContentUnrecoverable && (
                      <DropdownMenu.Item
                        accessibilityHint={t(
                          "scheduleDetail.management.editHint"
                        )}
                        closeOnPress
                        style={styles.managementMenuItem}
                        onPress={handleEdit}
                      >
                        <AppText
                          numberOfLines={1}
                          style={styles.managementMenuText}
                          variant="label"
                        >
                          {t("scheduleDetail.management.edit")}
                        </AppText>
                      </DropdownMenu.Item>
                    )}

                    <DropdownMenu.Item
                      accessibilityHint={t(
                        "scheduleDetail.management.deleteHint"
                      )}
                      closeOnPress
                      style={styles.managementMenuItem}
                      onPress={handleDelete}
                    >
                      <AppText
                        numberOfLines={1}
                        style={[
                          styles.managementMenuText,
                          styles.managementDeleteText,
                        ]}
                        variant="label"
                      >
                        {t("scheduleDetail.management.delete")}
                      </AppText>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            )
          }
          title={t("scheduleDetail.headerTitle")}
        />

        {isLoading ? (
          <View style={[styles.loadingContent, styles.scrollContent]}>
            <DetailLoadingPlaceholder />
          </View>
        ) : (
          <>
            <ScrollView
              bounces={false}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: scrollBottomPadding },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {queryErrorMessage && !isNotFound ? (
                <DetailError
                  message={queryErrorMessage}
                  onRetry={handleRetry}
                />
              ) : isNotFound || !item || !viewModel || !statusCard ? (
                <DetailNotFound />
              ) : (
                <>
                  {actionErrorMessage && (
                    <DetailInlineError message={actionErrorMessage} />
                  )}

                  {viewModel.contentRecovery && (
                    <DetailInlineError
                      message={viewModel.contentRecovery.description}
                      title={viewModel.contentRecovery.title}
                    />
                  )}

                  <DetailSummarySection
                    colorKey={viewModel.summary.colorKey}
                    notificationLabel={viewModel.summary.notificationLabel}
                    notificationsEnabled={
                      viewModel.summary.notificationsEnabled
                    }
                    recurrenceLabel={viewModel.summary.recurrenceLabel}
                    settingBadges={viewModel.summary.settingBadges}
                    title={viewModel.summary.title}
                  />

                  <DetailScheduleSection
                    dateLabel={statusCard.dateLabel}
                    metaLabel={statusCard.metaLabel}
                    timeLabel={statusCard.timeLabel}
                    title={statusCard.title}
                  />

                  <DetailHistorySection entries={viewModel.historyPreview} />
                </>
              )}
            </ScrollView>
          </>
        )}
      </View>
    </AppScreen>
  );
}
