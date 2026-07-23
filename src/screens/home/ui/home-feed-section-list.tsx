import { View, type ViewStyle } from "react-native";

import type { OccurrenceAction } from "~/schedule/rules/occurrence";
import { spacing } from "~/shared/ui/tokens";

import { HomeFeedSectionBlock } from "./home-feed-section-block";
import type {
  HomeFeedCard,
  HomeFeedSection,
} from "../model/home-feed-sections";

const FEED_SECTION_STACK_OVERLAP = spacing.lg;

type HomeFeedSectionListProps = {
  bottomNavReservedHeight: number;
  feedSections: HomeFeedSection[];
  feedViewportHeight: number;
  isLoading: boolean;
  onAction: (card: HomeFeedCard, action: OccurrenceAction) => void;
  processingOccurrenceIds: string[];
  selectedDateIsToday: boolean;
};

export function HomeFeedSectionList({
  bottomNavReservedHeight,
  feedSections,
  feedViewportHeight,
  isLoading,
  onAction,
  processingOccurrenceIds,
  selectedDateIsToday,
}: HomeFeedSectionListProps): React.JSX.Element {
  const feedSectionCount = Math.max(feedSections.length, 1);
  const baseCardSegmentHeight = Math.floor(
    feedViewportHeight / feedSectionCount
  );

  const getFeedSectionLayoutStyle = (
    section: HomeFeedSection,
    index: number
  ): ViewStyle => {
    const isStackedSection = index > 0;
    const isLastSection = index === feedSections.length - 1;
    const usesSegmentHeight = shouldFillFeedSegment(
      section,
      isLoading,
      selectedDateIsToday
    );
    const segmentHeight = isLastSection
      ? feedViewportHeight - baseCardSegmentHeight * (feedSectionCount - 1)
      : baseCardSegmentHeight;

    return {
      minHeight: usesSegmentHeight
        ? segmentHeight +
          (isLastSection ? bottomNavReservedHeight : FEED_SECTION_STACK_OVERLAP)
        : undefined,
      marginTop: isStackedSection ? -FEED_SECTION_STACK_OVERLAP : 0,
      paddingBottom: isLastSection ? bottomNavReservedHeight : undefined,
      zIndex: index + 1,
    };
  };

  return (
    <View>
      {feedSections.map((section, index) => {
        const isLastSection = index === feedSections.length - 1;

        return (
          <HomeFeedSectionBlock
            bottomOverlapInset={isLastSection ? 0 : FEED_SECTION_STACK_OVERLAP}
            isLoading={isLoading}
            key={section.id}
            onAction={onAction}
            processingOccurrenceIds={processingOccurrenceIds}
            selectedDateIsToday={selectedDateIsToday}
            section={section}
            style={getFeedSectionLayoutStyle(section, index)}
          />
        );
      })}
    </View>
  );
}

function shouldFillFeedSegment(
  section: HomeFeedSection,
  isLoading: boolean,
  selectedDateIsToday: boolean
): boolean {
  if (isLoading || section.items.length === 0) {
    return true;
  }

  return section.id === "selected-date" && !selectedDateIsToday;
}
