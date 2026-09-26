import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { getErrorMessage } from "~/errors";
import { getFirstRouteParam } from "~/route-param";
import { useDetailQuery } from "~/screens/schedule-detail/query";
import { DetailHistorySection } from "~/screens/schedule-detail/ui/history-section";
import { DetailManagementMenu } from "~/screens/schedule-detail/ui/management-menu";
import { DetailStatusSection } from "~/screens/schedule-detail/ui/status-section";
import { DetailSummarySection } from "~/screens/schedule-detail/ui/summary-section";
import { useThemeColors } from "~/theme/provider";
import { AppScreen } from "~/ui/app-screen";
import { FocusScreenHeader } from "~/ui/focus-screen-header";
import { StateMessage } from "~/ui/state-message";
import { spacing } from "~/ui/tokens";

export default function RecurringItemDetailPage(): React.JSX.Element {
  const { itemId, returnTo, scheduledAtUtc } = useLocalSearchParams<{
    itemId?: string | string[];
    returnTo?: string | string[];
    scheduledAtUtc?: string | string[];
  }>();

  const { t } = useTranslation();
  const themeColors = useThemeColors();

  const resolvedItemId = getFirstRouteParam(itemId);
  const resolvedReturnTo = getFirstRouteParam(returnTo);
  const resolvedScheduledAtUtc = getFirstRouteParam(scheduledAtUtc);

  const now = new Date();

  const detailQuery = useDetailQuery({
    itemId: resolvedItemId ?? null,
    now,
    scheduledAtUtc: resolvedScheduledAtUtc,
  });
  const isEntryOccurrence = Boolean(
    detailQuery.status === "ready" &&
    resolvedScheduledAtUtc &&
    detailQuery.basisOccurrence?.scheduledAtUtc === resolvedScheduledAtUtc
  );

  return (
    <AppScreen>
      <FocusScreenHeader
        onBack={() => {
          router.back();
        }}
        rightSlot={
          detailQuery.status === "ready" && (
            <DetailManagementMenu
              item={detailQuery.item}
              returnTo={resolvedReturnTo}
            />
          )
        }
        title={t("scheduleDetail.headerTitle")}
      />

      {detailQuery.status === "loading" && (
        <ActivityIndicator
          accessibilityLabel={t("scheduleDetail.loadingA11yLabel")}
          accessibilityRole="progressbar"
          color={themeColors.primary}
          size="large"
          style={styles.loadingContent}
        />
      )}

      {detailQuery.status !== "loading" && (
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {detailQuery.status === "error" && (
            <StateMessage
              action={{
                accessibilityHint: t("scheduleDetail.error.retryHint"),
                accessibilityLabel: t("scheduleDetail.error.retryLabel"),
                label: t("scheduleDetail.error.retryLabel"),
                onPress: () => {
                  void detailQuery.refetch();
                },
              }}
              description={
                !resolvedItemId
                  ? t("scheduleDetail.error.missingPath")
                  : detailQuery.error
                    ? getErrorMessage(detailQuery.error)
                    : undefined
              }
              style={styles.error}
              title={t("scheduleDetail.error.title")}
            />
          )}

          {detailQuery.status === "notFound" && (
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
              style={styles.error}
              title={t("scheduleDetail.notFound.title")}
            />
          )}

          {detailQuery.status === "ready" && (
            <>
              <DetailSummarySection item={detailQuery.item} />

              <DetailStatusSection
                isEntryOccurrence={isEntryOccurrence}
                now={now}
                occurrence={detailQuery.basisOccurrence}
                overdueCount={detailQuery.overdueCount}
                timezone={detailQuery.timezone}
              />

              <DetailHistorySection
                logs={detailQuery.history}
                timezone={detailQuery.timezone}
              />
            </>
          )}
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  error: {
    flex: 0,
    minHeight: 120,
  },
  loadingContent: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.xs,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
});
