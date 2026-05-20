import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MAIN_BOTTOM_NAV_RESERVED_HEIGHT } from "~/features/navigation";
import { AppScreen } from "~/shared/ui/app-screen";
import { colors } from "~/shared/ui/tokens";

import { HomeFeedErrorCard } from "./home-feed-error-card";
import { HomeFeedSectionList } from "./home-feed-section-list";
import { HomeLoadingPlaceholder } from "./home-loading-placeholder";
import { HomeTopPanel } from "./home-top-panel";
import { useHomeScreenController } from "../model/use-home-screen-controller";

export function HomeScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const home = useHomeScreenController();

  const [screenHeight, setScreenHeight] = useState(0);
  const [topPanelHeight, setTopPanelHeight] = useState(0);

  const bottomNavReservedHeight =
    MAIN_BOTTOM_NAV_RESERVED_HEIGHT + insets.bottom;
  const feedViewportHeight = Math.floor(
    Math.max(screenHeight - topPanelHeight - bottomNavReservedHeight, 0)
  );

  const handleTopPanelHeightChange = (height: number): void => {
    setTopPanelHeight((current) => (current === height ? current : height));
  };

  if (!home.isContentReady) {
    return (
      <AppScreen>
        <HomeLoadingPlaceholder />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <View
        onLayout={({ nativeEvent }) => {
          setScreenHeight((current) =>
            current === nativeEvent.layout.height
              ? current
              : nativeEvent.layout.height
          );
        }}
        style={styles.screenRoot}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.screenScroll}
        >
          <HomeTopPanel
            onHeightChange={handleTopPanelHeightChange}
            onSelectDate={home.onSelectDate}
            profileName={home.profileName}
            selectedDateId={home.selectedDateId}
          />

          {home.errorMessage ? (
            <HomeFeedErrorCard
              message={home.errorMessage}
              onRetry={home.onRetryFeed}
            />
          ) : null}

          <HomeFeedSectionList
            bottomNavReservedHeight={bottomNavReservedHeight}
            feedSections={home.feedSections}
            feedViewportHeight={feedViewportHeight}
            isLoading={home.isLoading}
            onAction={home.onOccurrenceAction}
            processingOccurrenceIds={home.processingOccurrenceIds}
            selectedDateIsToday={home.selectedDateIsToday}
          />
        </ScrollView>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    position: "relative",
  },
  screenRoot: {
    backgroundColor: colors.background,
    flex: 1,
  },
  screenScroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
