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

const ITEM_NOT_FOUND_MESSAGE = "반복 항목을 찾을 수 없습니다.";

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
  const { basisOccurrence, item, timezone } = detailQuery;

  let queryErrorMessage: string | null = null;

  if (!resolvedItemId) {
    queryErrorMessage = t("scheduleDetail.error.missingPath");
  } else if (detailQuery.error) {
    queryErrorMessage = getErrorMessage(detailQuery.error);
  }

  const isNotFound =
    !item &&
    !detailQuery.isLoading &&
    (queryErrorMessage === ITEM_NOT_FOUND_MESSAGE ||
      queryErrorMessage === null);
  const isEntryOccurrence = Boolean(
    resolvedScheduledAtUtc &&
    basisOccurrence?.scheduledAtUtc === resolvedScheduledAtUtc
  );

  return (
    <AppScreen>
      <FocusScreenHeader
        onBack={() => {
          router.back();
        }}
        rightSlot={
          item &&
          !queryErrorMessage && (
            <DetailManagementMenu item={item} returnTo={resolvedReturnTo} />
          )
        }
        title={t("scheduleDetail.headerTitle")}
      />

      {detailQuery.isLoading && (
        <ActivityIndicator
          accessibilityLabel={t("scheduleDetail.loadingA11yLabel")}
          accessibilityRole="progressbar"
          color={themeColors.primary}
          size="large"
          style={styles.loadingContent}
        />
      )}

      {!detailQuery.isLoading && (
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {queryErrorMessage && !isNotFound && (
            <StateMessage
              action={{
                accessibilityHint: t("scheduleDetail.error.retryHint"),
                accessibilityLabel: t("scheduleDetail.error.retryLabel"),
                label: t("scheduleDetail.error.retryLabel"),
                onPress: () => {
                  void detailQuery.refetch();
                },
              }}
              description={queryErrorMessage}
              style={styles.error}
              title={t("scheduleDetail.error.title")}
            />
          )}

          {isNotFound && (
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

          {!queryErrorMessage && !isNotFound && item && (
            <>
              <DetailSummarySection item={item} />

              <DetailStatusSection
                isEntryOccurrence={isEntryOccurrence}
                now={now}
                occurrence={basisOccurrence}
                overdueCount={detailQuery.overdueCount}
                timezone={timezone}
              />

              <DetailHistorySection
                logs={detailQuery.history}
                timezone={timezone}
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
