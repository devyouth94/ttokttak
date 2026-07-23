import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { MAIN_BOTTOM_NAV_RESERVED_HEIGHT } from "~/application/navigation";
import { ItemRow } from "~/schedule/ui/item-row";
import { type Sort, useItems } from "~/screens/schedule-list/list";
import { ListEmpty } from "~/screens/schedule-list/ui/empty";
import { ListLoading } from "~/screens/schedule-list/ui/loading";
import { ListSortMenu } from "~/screens/schedule-list/ui/sort-menu";
import { AppScreen } from "~/shared/ui/app-screen";
import { ScreenHeader } from "~/shared/ui/screen-header";
import { spacing } from "~/shared/ui/tokens";
import { useThemeColors } from "~/theme/provider";
import { StateMessage } from "~/ui/state-message";

export default function ScheduleTabPage(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const themeColors = useThemeColors();

  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<Sort>("titleAsc");
  const { refetch, rows, status } = useItems(sort);

  async function refresh(): Promise<void> {
    setRefreshing(true);

    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <AppScreen>
      <ScreenHeader title={t("scheduleList.headerTitle")} />

      {status === "loading" && (
        <View style={[styles.staticContent, styles.listContent]}>
          <ListLoading />
        </View>
      )}

      {status === "error" && (
        <View style={styles.staticContent}>
          <StateMessage
            action={{
              accessibilityHint: t("scheduleList.error.retryHint"),
              accessibilityLabel: t("scheduleList.error.retryLabel"),
              label: t("scheduleList.error.retryLabel"),
              onPress: refetch,
            }}
            title={t("scheduleList.error.title")}
          />
        </View>
      )}

      {status === "ready" && (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            rows.length === 0 && styles.emptyListContent,
            { paddingBottom: MAIN_BOTTOM_NAV_RESERVED_HEIGHT + insets.bottom },
          ]}
          data={rows}
          keyExtractor={(row) => row.id}
          ListHeaderComponent={
            <>
              {rows.length > 0 && (
                <ListSortMenu onChange={setSort} value={sort} />
              )}
            </>
          }
          ListEmptyComponent={<ListEmpty />}
          refreshControl={
            <RefreshControl
              onRefresh={refresh}
              refreshing={refreshing}
              tintColor={themeColors.primary}
            />
          }
          renderItem={({ index, item }) => (
            <ItemRow
              accessibilityHint={t("scheduleList.row.detailHint")}
              accessibilityLabel={t("scheduleList.row.detailLabel", {
                title: item.title,
              })}
              colorKey={item.colorKey}
              isLast={index === rows.length - 1}
              metaLine={[
                item.nextOccurrenceTimeLabel,
                item.recurrenceLabel,
              ].join(" · ")}
              onPress={() => {
                router.push({
                  params: {
                    itemId: item.id,
                    returnTo: "/schedule",
                    ...(item.nextScheduledAtUtc
                      ? { scheduledAtUtc: item.nextScheduledAtUtc }
                      : {}),
                  },
                  pathname: "/items/[itemId]",
                });
              }}
              title={item.title}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  emptyListContent: {
    flexGrow: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  staticContent: {
    flex: 1,
  },
});
