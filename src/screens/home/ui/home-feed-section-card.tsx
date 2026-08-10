import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import type { OccurrenceAction } from "~/schedule/rules/occurrence";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing } from "~/ui/tokens";

import { homeFeedCardPalette } from "./home-feed-card-palette";
import { HomeFeedItem } from "./home-feed-item";
import type { HomeFeedCard, HomeFeedSection } from "../sections";

type HomeFeedSectionCardProps = {
  bottomOverlap: number;
  isToday: boolean;
  loading: boolean;
  onAction: (card: HomeFeedCard, action: OccurrenceAction) => void;
  section: HomeFeedSection;
  style: StyleProp<ViewStyle>;
};

/** 홈 피드의 섹션 제목, 카드 목록과 빈 상태를 표시한다. */
export function HomeFeedSectionCard({
  bottomOverlap,
  isToday,
  loading,
  onAction,
  section,
  style,
}: HomeFeedSectionCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const summary = loading ? t("home.feed.loading") : section.emptyMessage;
  const showsActions =
    section.id === "overdue" || (section.id === "selected-date" && isToday);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: homeFeedCardPalette.sectionBackground[section.id],
        },
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleSlot}>
          <AppText style={styles.text} variant="title">
            {section.title}
          </AppText>
        </View>
        <AppText style={styles.text} variant="body">
          {loading
            ? "-"
            : t("home.feed.sectionCount", { count: section.items.length })}
        </AppText>
      </View>
      {section.caption && (
        <View style={styles.caption}>
          <AppText style={styles.mutedText} variant="caption">
            {section.caption}
          </AppText>
        </View>
      )}
      {section.items.length > 0 && !loading ? (
        <View
          style={[
            styles.itemList,
            bottomOverlap > 0 && { paddingBottom: bottomOverlap },
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
                {showsDateSeparator && (
                  <View
                    style={[
                      styles.dateSeparator,
                      index > 0 && styles.stackedDateSeparator,
                    ]}
                  >
                    <AppText
                      style={[styles.dateSeparatorText, styles.text]}
                      variant="body2"
                    >
                      {card.dateSeparatorLabel}
                    </AppText>
                    <AppText style={styles.mutedText} variant="body3">
                      {t("home.feed.dateSeparatorCount", {
                        count: countItemsOnDate(section.items, card),
                      })}
                    </AppText>
                  </View>
                )}
                <HomeFeedItem
                  card={card}
                  isLast={shouldHideDivider(section.id, nextCard)}
                  onAction={onAction}
                  showsActions={showsActions}
                />
              </Fragment>
            );
          })}
        </View>
      ) : (
        <View style={styles.summary}>
          <View style={styles.summaryCopy}>
            <AppText style={styles.mutedText} variant="body">
              {summary}
            </AppText>
          </View>
        </View>
      )}
    </View>
  );
}

function shouldShowDateSeparator(
  card: HomeFeedCard,
  previousCard: HomeFeedCard | undefined
): boolean {
  return (
    Boolean(card.dateSeparatorLabel) &&
    card.occurrence.localDate !== previousCard?.occurrence.localDate
  );
}

function countItemsOnDate(cards: HomeFeedCard[], target: HomeFeedCard): number {
  return cards.filter(
    (card) => card.occurrence.localDate === target.occurrence.localDate
  ).length;
}

/** 다가오는 섹션은 날짜 구분선으로 묶으므로 항목 구분선을 표시하지 않는다. */
function shouldHideDivider(
  sectionId: HomeFeedSection["id"],
  nextCard: HomeFeedCard | undefined
): boolean {
  return !nextCard || sectionId === "upcoming";
}

const styles = StyleSheet.create({
  caption: {
    marginTop: spacing.xxs,
    opacity: 0.72,
  },
  card: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  dateSeparator: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
  dateSeparatorText: {
    flex: 1,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  itemList: {
    marginTop: spacing.xxs,
  },
  mutedText: {
    color: homeFeedCardPalette.mutedText,
  },
  stackedDateSeparator: {
    paddingTop: spacing.sm,
  },
  summary: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  summaryCopy: {
    opacity: 0.72,
  },
  text: {
    color: homeFeedCardPalette.text,
  },
  titleSlot: {
    flex: 1,
  },
});
