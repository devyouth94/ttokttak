import { Fragment } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { AppText } from "~/design-system/components/app-text";
import { borderRadius, color, spacing } from "~/design-system/tokens";
import type { CompletionAction } from "~/features/recurring/domain/types";

import { HomeFeedItemRow } from "./home-feed-item-row";
import type { HomeFeedCard, HomeFeedSection } from "./home-screen.helpers";

type HomeFeedSectionBlockProps = {
  bottomOverlapInset: number;
  isLoading: boolean;
  onAction: (card: HomeFeedCard, action: CompletionAction) => void;
  processingOccurrenceIds: string[];
  selectedDateIsToday: boolean;
  section: HomeFeedSection;
  style: StyleProp<ViewStyle>;
};

export function HomeFeedSectionBlock({
  bottomOverlapInset,
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
      {section.caption ? (
        <View style={styles.feedSectionCaption}>
          <AppText style={textStyle} variant="caption">
            {section.caption}
          </AppText>
        </View>
      ) : null}
      {section.items.length > 0 && !isLoading ? (
        <View
          style={[
            styles.feedItemList,
            bottomOverlapInset > 0 && { paddingBottom: bottomOverlapInset },
          ]}
        >
          {section.items.map((card, index) => {
            const previousCard = section.items[index - 1];
            const nextCard = section.items[index + 1];
            const showsDateSeparator = shouldShowDateSeparator(
              card,
              previousCard
            );

            return (
              <Fragment key={card.id}>
                {showsDateSeparator ? (
                  <View
                    style={[
                      styles.feedDateSeparator,
                      index > 0 && styles.feedDateSeparatorStacked,
                    ]}
                  >
                    <AppText
                      style={[textStyle, styles.feedDateSeparatorText]}
                      variant="body3"
                    >
                      {card.dateSeparatorLabel}
                    </AppText>
                  </View>
                ) : null}
                <HomeFeedItemRow
                  card={card}
                  isLast={shouldHideItemDivider(card, nextCard)}
                  isProcessing={processingOccurrenceIds.includes(card.id)}
                  onAction={onAction}
                  showsActions={showsActions}
                  usesLightContent={usesLightContent}
                />
              </Fragment>
            );
          })}
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

function shouldShowDateSeparator(
  card: HomeFeedCard,
  previousCard: HomeFeedCard | undefined
): boolean {
  if (!card.dateSeparatorLabel) {
    return false;
  }

  return card.occurrence.localDate !== previousCard?.occurrence.localDate;
}

function shouldHideItemDivider(
  card: HomeFeedCard,
  nextCard: HomeFeedCard | undefined
): boolean {
  if (!nextCard) {
    return true;
  }

  if (!card.dateSeparatorLabel) {
    return false;
  }

  return card.occurrence.localDate !== nextCard.occurrence.localDate;
}

const styles = StyleSheet.create({
  feedDateSeparator: {
    paddingTop: spacing.xs,
  },
  feedDateSeparatorStacked: {
    paddingTop: spacing.sm,
  },
  feedDateSeparatorText: {
    opacity: 0.72,
  },
  feedItemList: {
    marginTop: spacing.xxs,
  },
  feedSectionCard: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  feedSectionCaption: {
    marginTop: spacing.xxs,
    opacity: 0.72,
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
    paddingBottom: spacing.lg,
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
