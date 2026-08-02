import { StyleSheet, View } from "react-native";

import { spacing } from "~/ui/tokens";

import { HomeDateCarousel } from "./home-date-carousel";
import { HomeHeader } from "./home-header";

type HomeTopPanelProps = {
  onHeightChange: (height: number) => void;
  onSelectDate: (dateId: string) => void;
  profileName: string;
  selectedDateId: string;
};

export function HomeTopPanel({
  onHeightChange,
  onSelectDate,
  profileName,
  selectedDateId,
}: HomeTopPanelProps): React.JSX.Element {
  return (
    <View
      onLayout={({ nativeEvent }) => {
        onHeightChange(nativeEvent.layout.height);
      }}
      style={styles.topPanel}
    >
      <HomeHeader profileName={profileName} />

      <HomeDateCarousel
        onSelectDate={onSelectDate}
        selectedDateId={selectedDateId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topPanel: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
});
