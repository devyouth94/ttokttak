import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Animated, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as DropdownMenu from "@rn-primitives/dropdown-menu";
import { Bell, BellOff, EllipsisVertical } from "lucide-react-native";

import { useScheduleReadContext } from "~/application/schedule-read";
import type { RecurringItemColorKey } from "~/entities/schedule";
import {
  getRecurringItemColorLabel,
  recurringItemColorOptionByKey,
} from "~/entities/schedule";
import { archiveSchedule } from "~/features/archive-schedule";
import {
  useScheduleByIdQuery,
  useScheduleCompletionLogsQuery,
} from "~/features/read-schedule";
import { useAppLanguage } from "~/shared/i18n";
import { getErrorMessage } from "~/shared/lib/errors/get-error-message";
import { AppScreen } from "~/shared/ui/app-screen";
import { AppRetryStatePanel, AppStatePanel } from "~/shared/ui/app-state";
import { AppText } from "~/shared/ui/app-text";
import { FocusScreenHeader } from "~/shared/ui/focus-screen-header";
import { IconButton } from "~/shared/ui/icon-button";
import { colors, spacing } from "~/shared/ui/tokens";
import { useCollapsibleHeader } from "~/shared/ui/use-collapsible-header";

import { scheduleDetailScreenStyles as styles } from "./schedule-detail-screen.styles";
import {
  buildOccurrenceStatusCard,
  buildRecurringItemDetailViewModel,
  getItemDetailBasisOccurrence,
  getRecurringItemDetailDeleteReturnPath,
  type ItemDetailHistoryEntry,
  type ItemDetailSummaryBadge,
} from "../model/schedule-detail-model";

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
  colorKey: RecurringItemColorKey;
  notificationLabel: string;
  notificationsEnabled: boolean;
  recurrenceLabel: string;
  settingBadges: ItemDetailSummaryBadge[];
  title: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const NotificationIcon = notificationsEnabled ? Bell : BellOff;
  const colorOption = recurringItemColorOptionByKey[colorKey];
  const colorLabel = getRecurringItemColorLabel(colorKey, language);
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
                  color={colors.text}
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

        {extraBadges.length > 0 ? (
          <View style={styles.summaryOutlineGroup}>
            {extraBadges.map((badge) => (
              <DetailSummaryOutlineRow
                key={badge.id}
                label={badge.label}
                value={badge.value}
              />
            ))}
          </View>
        ) : null}
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

function DetailErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <AppRetryStatePanel
      description={message}
      minHeight={120}
      onRetry={onRetry}
      retryAccessibilityHint={t("scheduleDetail.error.retryHint")}
      retryAccessibilityLabel={t("scheduleDetail.error.retryLabel")}
      title={t("scheduleDetail.error.title")}
    />
  );
}

function DetailInlineErrorCard({
  message,
  title,
}: {
  message: string;
  title?: string;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <AppStatePanel
      description={message}
      minHeight={96}
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
  const isCompleted = entry.action === "completed";
  const statusChipStyle = isCompleted
    ? styles.historyStatusChipCompleted
    : styles.historyStatusChipSkipped;
  const statusChipTextStyle = isCompleted
    ? styles.historyStatusChipTextCompleted
    : styles.historyStatusChipTextSkipped;

  return (
    <View style={[styles.historyRow, !isFirst && styles.historyRowDivider]}>
      <AppText style={styles.historyDate} variant="body3">
        {entry.timeLabel}
      </AppText>
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

function DetailNotFoundCard(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <AppStatePanel
      action={{
        accessibilityHint: t("scheduleDetail.notFound.homeHint"),
        accessibilityLabel: t("scheduleDetail.notFound.homeLabel"),
        label: t("scheduleDetail.notFound.homeLabel"),
        onPress: () => {
          router.replace("/");
        },
      }}
      description={t("scheduleDetail.notFound.description")}
      minHeight={120}
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
  const { isReady, timezone, userId } = useScheduleReadContext();
  const insets = useSafeAreaInsets();
  const {
    headerAnimatedStyle,
    headerHeight,
    onHeaderHeightChange,
    onScroll,
    scrollEventThrottle,
  } = useCollapsibleHeader({ hiddenOffset: insets.top });
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(
    null
  );
  const [isArchiving, setIsArchiving] = useState(false);

  const itemQuery = useScheduleByIdQuery({
    enabled: isReady,
    itemId: itemId ?? null,
    timezone,
    userId,
  });
  const completionLogsQuery = useScheduleCompletionLogsQuery({
    enabled: isReady,
    itemId: itemId ?? null,
    userId,
  });
  const isLoading =
    !isReady ||
    !userId ||
    itemQuery.isPending ||
    (Boolean(itemQuery.data) && completionLogsQuery.isPending);
  const queryErrorMessage = !itemId
    ? t("scheduleDetail.error.missingPath")
    : itemQuery.error
      ? getErrorMessage(itemQuery.error)
      : completionLogsQuery.error
        ? getErrorMessage(completionLogsQuery.error)
        : null;

  const item = itemQuery.data;
  const completionLogs = completionLogsQuery.data ?? [];
  const now = new Date();
  const viewModel = item
    ? buildRecurringItemDetailViewModel({
        completionLogs,
        item,
        language,
        now,
        timezone,
      })
    : null;
  const basisOccurrence =
    item && viewModel
      ? getItemDetailBasisOccurrence({
          completionLogs,
          item,
          now,
          primaryOccurrence: viewModel.primaryOccurrence,
          scheduledAtUtc,
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
  const isContentUnrecoverable =
    item?.contentStatus?.status === "unrecoverable";
  const isNotFound =
    !item &&
    !isLoading &&
    (queryErrorMessage === ITEM_NOT_FOUND_MESSAGE ||
      queryErrorMessage === null);
  const scrollBottomPadding = spacing.lg;
  const scrollTopPadding = headerHeight;

  const refetchDetail = async (): Promise<void> => {
    await Promise.all([itemQuery.refetch(), completionLogsQuery.refetch()]);
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
        timezone,
        userId,
      });

      router.replace(getRecurringItemDetailDeleteReturnPath(returnTo));
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
    <AppScreen contentStyle={styles.screenContent}>
      <View style={styles.screenRoot}>
        <Animated.View style={[styles.headerLayer, headerAnimatedStyle]}>
          <FocusScreenHeader
            onBack={() => {
              router.back();
            }}
            onHeightChange={onHeaderHeightChange}
            rightSlot={
              item && !queryErrorMessage ? (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <IconButton
                      accessibilityHint={t(
                        "scheduleDetail.management.menuHint"
                      )}
                      accessibilityLabel={t(
                        "scheduleDetail.management.menuLabel"
                      )}
                      disabled={isMutating}
                      icon={<EllipsisVertical color={colors.text} size={20} />}
                      size="lg"
                    />
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Overlay
                      closeOnPress
                      style={styles.managementMenuOverlay}
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
                      {isContentUnrecoverable ? null : (
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
              ) : undefined
            }
            title={t("scheduleDetail.headerTitle")}
          />
        </Animated.View>

        {isLoading ? (
          <View
            style={[
              styles.loadingContent,
              styles.scrollContent,
              { paddingTop: headerHeight },
            ]}
          >
            <DetailLoadingPlaceholder />
          </View>
        ) : (
          <>
            <ScrollView
              bounces={false}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingTop: scrollTopPadding },
                { paddingBottom: scrollBottomPadding },
              ]}
              onScroll={onScroll}
              scrollEventThrottle={scrollEventThrottle}
              showsVerticalScrollIndicator={false}
            >
              {queryErrorMessage && !isNotFound ? (
                <DetailErrorCard
                  message={queryErrorMessage}
                  onRetry={handleRetry}
                />
              ) : isNotFound || !item || !viewModel || !statusCard ? (
                <DetailNotFoundCard />
              ) : (
                <>
                  {actionErrorMessage ? (
                    <DetailInlineErrorCard message={actionErrorMessage} />
                  ) : null}

                  {viewModel.contentRecovery ? (
                    <DetailInlineErrorCard
                      message={viewModel.contentRecovery.description}
                      title={viewModel.contentRecovery.title}
                    />
                  ) : null}

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
