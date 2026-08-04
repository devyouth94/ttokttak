import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RotateCw } from "lucide-react-native";

import { useHomeFeed } from "~/screens/home/feed";
import { useHomeFeedLayout } from "~/screens/home/layout";
import { useHomeNotificationPrompt } from "~/screens/home/permission";
import { HomeDateCarousel } from "~/screens/home/ui/home-date-carousel";
import { HomeFeedSections } from "~/screens/home/ui/home-feed-sections";
import { HomeLoadingPlaceholder } from "~/screens/home/ui/home-loading-placeholder";
import { useSession } from "~/session/provider";
import { useThemeColors } from "~/theme/provider";
import { AppScreen } from "~/ui/app-screen";
import { AppText } from "~/ui/app-text";
import { StateMessage } from "~/ui/state-message";
import { spacing } from "~/ui/tokens";

export default function HomeTabPage(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const { profile } = useSession();

  const home = useHomeFeed();
  const layout = useHomeFeedLayout(insets.bottom);

  const profileName = profile?.display_name?.trim() || "사용자";

  useHomeNotificationPrompt();

  if (home.status === "starting") {
    return (
      <AppScreen>
        <HomeLoadingPlaceholder />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View onLayout={layout.measureScreen} style={styles.screenRoot}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.screenScroll}
        >
          <View onLayout={layout.measureTop} style={styles.topPanel}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <AppText
                  ellipsizeMode="tail"
                  numberOfLines={2}
                  variant="display"
                >
                  {t("home.header.greeting", { name: profileName })}
                </AppText>
              </View>
            </View>

            <HomeDateCarousel
              onSelectDate={home.selectDate}
              selectedDateId={home.selectedDateId}
            />
          </View>

          {home.errorMessage && (
            <StateMessage
              action={{
                accessibilityHint: t("home.feed.retryHint"),
                accessibilityLabel: t("home.feed.retryLabel"),
                icon: <RotateCw color={themeColors.text} size={16} />,
                label: t("home.feed.retryLabel"),
                onPress: home.retry,
              }}
              description={home.errorMessage}
              style={styles.error}
              title={t("home.feed.errorTitle")}
            />
          )}

          <HomeFeedSections
            bottomInset={layout.bottomInset}
            height={layout.feedHeight}
            isToday={home.isToday}
            loading={home.status === "loading"}
            onAction={home.runAction}
            sections={home.sections}
          />
        </ScrollView>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  error: {
    flex: 0,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    minHeight: 112,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    minHeight: 76,
    width: "100%",
  },
  headerCopy: {
    flex: 1,
  },
  screenRoot: {
    flex: 1,
  },
  screenScroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  topPanel: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
});
