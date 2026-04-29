import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { AppText } from "~/design-system/components/app-text";
import { color, spacing } from "~/design-system/tokens";
import type { CompletionAction } from "~/features/recurring/domain/types";

import { HomeFeedItemRow } from "./home-feed-item-row";
import type { HomeFeedCard, HomeFeedSection } from "./home-screen.helpers";

type HomeFeedSectionBlockProps = {
  isLoading: boolean;
  onAction: (card: HomeFeedCard, action: CompletionAction) => void;
  processingOccurrenceIds: string[];
  selectedDateIsToday: boolean;
  section: HomeFeedSection;
  style: StyleProp<ViewStyle>;
};

export function HomeFeedSectionBlock({
  isLoading,
  onAction,
  processingOccurrenceIds,
  selectedDateIsToday,
  section,
  style,
}: HomeFeedSectionBlockProps): React.JSX.Element {
  const usesLightContent = section.id === "upcoming";
  const textStyle = usesLightContent
    ? styles.feedSectionTextLight
    : styles.feedSectionTextDark;
  const summary = getFeedSectionSummary(section, isLoading);
  const showsActions =
    section.id === "overdue" ||
    (section.id === "selected-date" && selectedDateIsToday);

  return (
    <View
      style={[
        styles.feedSectionCard,
        getFeedSectionCardStyle(section.id),
        style,
      ]}
    >
      <View style={styles.feedSectionHeader}>
        <View style={styles.feedSectionTitleSlot}>
          <AppText style={textStyle} variant="title">
            {section.title}
          </AppText>
        </View>
        <AppText style={textStyle} variant="body">
          {isLoading ? "-" : `${section.items.length}개`}
        </AppText>
      </View>
      {section.items.length > 0 && !isLoading ? (
        <View style={styles.feedItemList}>
          {section.items.map((card, index) => (
            <HomeFeedItemRow
              card={card}
              isLast={index === section.items.length - 1}
              isProcessing={processingOccurrenceIds.includes(card.id)}
              key={card.id}
              onAction={onAction}
              showsActions={showsActions}
              usesLightContent={usesLightContent}
            />
          ))}
        </View>
      ) : (
        <View style={styles.feedSectionSummarySlot}>
          <View style={styles.feedSectionSummaryCopy}>
            <AppText style={textStyle} variant="body">
              {summary}
            </AppText>
          </View>
        </View>
      )}
    </View>
  );
}

function getFeedSectionSummary(
  section: HomeFeedSection,
  isLoading: boolean
): string {
  if (isLoading) {
    return "불러오고 있어요";
  }

  if (section.items.length > 0) {
    return `${section.items.length}개의 일정이 있어요`;
  }

  return section.emptyMessage;
}

function getFeedSectionCardStyle(
  sectionId: HomeFeedSection["id"]
): StyleProp<ViewStyle> {
  switch (sectionId) {
    case "overdue":
      return styles.feedSectionOverdue;
    case "selected-date":
      return styles.feedSectionSelectedDate;
    case "upcoming":
      return styles.feedSectionUpcoming;
  }
}

const styles = StyleSheet.create({
  feedItemList: {
    marginTop: spacing.xxs,
  },
  feedSectionCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  feedSectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  feedSectionOverdue: {
    backgroundColor: color.oldFlax,
  },
  feedSectionSelectedDate: {
    backgroundColor: color.purple,
  },
  feedSectionSummarySlot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  feedSectionSummaryCopy: {
    opacity: 0.72,
  },
  feedSectionTextDark: {
    color: color.jetBlack,
  },
  feedSectionTextLight: {
    color: color.white,
  },
  feedSectionTitleSlot: {
    flex: 1,
  },
  feedSectionUpcoming: {
    backgroundColor: color.royalBlue,
  },
});
