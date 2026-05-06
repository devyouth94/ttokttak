import { Fragment } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { AppText } from "~/design-system/components/app-text";
import { borderRadius, colors, spacing } from "~/design-system/tokens";
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
          <AppText style={styles.feedSectionText} variant="title">
            {section.title}
          </AppText>
        </View>
        <AppText style={styles.feedSectionText} variant="body">
          {isLoading ? "-" : `${section.items.length}개`}
        </AppText>
      </View>
      {section.caption ? (
        <View style={styles.feedSectionCaption}>
          <AppText style={styles.feedSectionText} variant="caption">
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
                      style={styles.feedDateSeparatorText}
                      variant="body2"
                    >
                      {card.dateSeparatorLabel}
                    </AppText>
                    <AppText
                      style={styles.feedDateSeparatorCount}
                      variant="body3"
                    >
                      {getDateSeparatorItemCount(section.items, card)}개
                    </AppText>
                  </View>
                ) : null}
                <HomeFeedItemRow
                  card={card}
                  isLast={shouldHideItemDivider(section.id, card, nextCard)}
                  isProcessing={processingOccurrenceIds.includes(card.id)}
                  onAction={onAction}
                  showsActions={showsActions}
                  usesLightContent={false}
                />
              </Fragment>
            );
          })}
        </View>
      ) : (
        <View style={styles.feedSectionSummarySlot}>
          <View style={styles.feedSectionSummaryCopy}>
            <AppText style={styles.feedSectionText} variant="body">
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

function getDateSeparatorItemCount(
  cards: HomeFeedCard[],
  targetCard: HomeFeedCard
): number {
  return cards.filter(
    (card) => card.occurrence.localDate === targetCard.occurrence.localDate
  ).length;
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
  sectionId: HomeFeedSection["id"],
  card: HomeFeedCard,
  nextCard: HomeFeedCard | undefined
): boolean {
  if (!nextCard) {
    return true;
  }

  if (sectionId !== "upcoming") {
    return false;
  }

  return true;
}

const styles = StyleSheet.create({
  feedDateSeparator: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
  feedDateSeparatorCount: {
    color: colors.textSoft,
  },
  feedDateSeparatorStacked: {
    paddingTop: spacing.sm,
  },
  feedDateSeparatorText: {
    color: colors.text,
    flex: 1,
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
    backgroundColor: colors.statusOverdueSoft,
  },
  feedSectionSelectedDate: {
    backgroundColor: colors.statusCompletedSoft,
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
  feedSectionText: {
    color: colors.text,
  },
  feedSectionTitleSlot: {
    flex: 1,
  },
  feedSectionUpcoming: {
    backgroundColor: colors.statusScheduledSoft,
  },
});
