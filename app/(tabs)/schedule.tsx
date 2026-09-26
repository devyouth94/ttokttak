import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { ItemRow } from "~/schedule/ui/item-row";
import { useScheduleList } from "~/screens/schedule-list/list";
import { ListEmpty } from "~/screens/schedule-list/ui/empty";
import { ListLoading } from "~/screens/schedule-list/ui/loading";
import { ListSortMenu } from "~/screens/schedule-list/ui/sort-menu";
import { useThemeColors } from "~/theme/provider";
import { AppScreen } from "~/ui/app-screen";
import { getMainTabContentBottomInset } from "~/ui/main-bottom-nav";
import { ScreenHeader } from "~/ui/screen-header";
import { StateMessage } from "~/ui/state-message";
import { spacing } from "~/ui/tokens";

export default function ScheduleTabPage(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const themeColors = useThemeColors();

  const list = useScheduleList();

  return (
    <AppScreen>
      <ScreenHeader title={t("scheduleList.headerTitle")} />

      {list.status === "loading" && (
        <View style={[styles.staticContent, styles.listContent]}>
          <ListLoading />
        </View>
      )}

      {list.status === "error" && (
        <View style={styles.staticContent}>
          <StateMessage
            action={{
              accessibilityHint: t("scheduleList.error.retryHint"),
              accessibilityLabel: t("scheduleList.error.retryLabel"),
              label: t("scheduleList.error.retryLabel"),
              onPress: list.retry,
            }}
            title={t("scheduleList.error.title")}
          />
        </View>
      )}

      {list.status === "ready" && (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            list.rows.length === 0 && styles.emptyListContent,
            { paddingBottom: getMainTabContentBottomInset(insets.bottom) },
          ]}
          data={list.rows}
          keyExtractor={(row) => row.id}
          ListHeaderComponent={
            <>
              {list.rows.length > 0 && (
                <ListSortMenu onChange={list.setSort} value={list.sort} />
              )}
            </>
          }
          ListEmptyComponent={<ListEmpty />}
          refreshControl={
            <RefreshControl
              onRefresh={list.refresh}
              refreshing={list.refreshing}
              tintColor={themeColors.primary}
            />
          }
          renderItem={({ index, item }) => (
            <ItemRow
              accessibilityHint={t("scheduleList.row.detailHint")}
              accessibilityLabel={t("scheduleList.row.detailLabel", {
                title: item.title,
              })}
              colorHex={item.colorHex}
              isLast={index === list.rows.length - 1}
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
