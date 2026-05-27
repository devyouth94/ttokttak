import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import type { CompletionAction } from "~/entities/schedule";
import { AppText } from "~/shared/ui/app-text";
import { borderRadius, spacing } from "~/shared/ui/tokens";

import {
  getHomeFeedSectionCardStyle,
  homeFeedCardPalette,
} from "./home-feed-card-palette";
import { HomeFeedItemRow } from "./home-feed-item-row";
import type {
  HomeFeedCard,
  HomeFeedSection,
} from "../model/home-feed-sections";

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
  const { t } = useTranslation();
  const summary = getFeedSectionSummary(section, isLoading, t);
  const showsActions =
    section.id === "overdue" ||
    (section.id === "selected-date" && selectedDateIsToday);

  return (
    <View
      style={[
        styles.feedSectionCard,
        getHomeFeedSectionCardStyle(section.id),
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
          {isLoading
            ? "-"
            : t("home.feed.sectionCount", { count: section.items.length })}
        </AppText>
      </View>
      {section.caption ? (
        <View style={styles.feedSectionCaption}>
          <AppText style={styles.feedSectionMutedText} variant="caption">
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
                      style={[
                        styles.feedDateSeparatorText,
                        styles.feedSectionText,
                      ]}
                      variant="body2"
                    >
                      {card.dateSeparatorLabel}
                    </AppText>
                    <AppText
                      style={styles.feedSectionMutedText}
                      variant="body3"
                    >
                      {t("home.feed.dateSeparatorCount", {
                        count: getDateSeparatorItemCount(section.items, card),
                      })}
                    </AppText>
                  </View>
                ) : null}
                <HomeFeedItemRow
                  card={card}
                  isLast={shouldHideItemDivider(section.id, nextCard)}
                  isProcessing={processingOccurrenceIds.includes(card.id)}
                  onAction={onAction}
                  showsActions={showsActions}
                />
              </Fragment>
            );
          })}
        </View>
      ) : (
        <View style={styles.feedSectionSummarySlot}>
          <View style={styles.feedSectionSummaryCopy}>
            <AppText style={styles.feedSectionMutedText} variant="body">
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
  isLoading: boolean,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (isLoading) {
    return t("home.feed.loading");
  }

  if (section.items.length > 0) {
    return t("home.feed.sectionSummary", { count: section.items.length });
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
  feedDateSeparatorCount: {},
  feedDateSeparatorStacked: {
    paddingTop: spacing.sm,
  },
  feedDateSeparatorText: {
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
  feedSectionMutedText: {
    color: homeFeedCardPalette.mutedText,
  },
  feedSectionText: {
    color: homeFeedCardPalette.text,
  },
  feedSectionTitleSlot: {
    flex: 1,
  },
  feedSectionUpcoming: {},
});
