import { View, type ViewStyle } from "react-native";

import type { OccurrenceAction } from "~/schedule/model";
import { spacing } from "~/ui/tokens";

import { HomeFeedSectionCard } from "./home-feed-section-card";
import type { HomeFeedCard, HomeFeedSection } from "../presentation";

const FEED_SECTION_STACK_OVERLAP = spacing.lg;

type HomeFeedSectionsProps = {
  bottomInset: number;
  height: number;
  isToday: boolean;
  loading: boolean;
  onAction: (card: HomeFeedCard, action: OccurrenceAction) => void;
  sections: HomeFeedSection[];
};

/**
 * 홈 섹션을 현재 카드 겹침 UI에 맞춰 세로로 배치한다.
 * 겹침 UI를 제거하면 높이 배분과 overlap 계산도 함께 삭제한다.
 */
export function HomeFeedSections({
  bottomInset,
  height,
  isToday,
  loading,
  onAction,
  sections,
}: HomeFeedSectionsProps): React.JSX.Element {
  const sectionCount = Math.max(sections.length, 1);
  const baseHeight = Math.floor(height / sectionCount);

  function getSectionStyle(section: HomeFeedSection, index: number): ViewStyle {
    const isStackedSection = index > 0;
    const isLastSection = index === sections.length - 1;
    const fillsSegment = shouldFillSegment(section, loading, isToday);
    const segmentHeight = isLastSection
      ? height - baseHeight * (sectionCount - 1)
      : baseHeight;

    return {
      minHeight: fillsSegment
        ? segmentHeight +
          (isLastSection ? bottomInset : FEED_SECTION_STACK_OVERLAP)
        : undefined,
      marginTop: isStackedSection ? -FEED_SECTION_STACK_OVERLAP : 0,
      paddingBottom: isLastSection ? bottomInset : undefined,
      zIndex: index + 1,
    };
  }

  return (
    <View>
      {sections.map((section, index) => {
        const isLastSection = index === sections.length - 1;

        return (
          <HomeFeedSectionCard
            bottomOverlap={isLastSection ? 0 : FEED_SECTION_STACK_OVERLAP}
            isToday={isToday}
            key={section.id}
            loading={loading}
            onAction={onAction}
            section={section}
            style={getSectionStyle(section, index)}
          />
        );
      })}
    </View>
  );
}

/** 내용이 짧아도 현재 카드 겹침 위치를 유지해야 하는 섹션인지 판단한다. */
function shouldFillSegment(
  section: HomeFeedSection,
  loading: boolean,
  isToday: boolean
): boolean {
  return (
    loading ||
    section.items.length === 0 ||
    (section.id === "selected-date" && !isToday)
  );
}
