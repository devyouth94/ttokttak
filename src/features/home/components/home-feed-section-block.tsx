import {
  Pressable,
  type StyleProp,
  StyleSheet,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { router } from "expo-router";
import { Check, SkipForward } from "lucide-react-native";

import { AppText } from "~/design-system/components/app-text";
import { borderRadius, color, spacing } from "~/design-system/tokens";
import type { CompletionAction } from "~/features/recurring/domain/types";

import type { HomeFeedCard, HomeFeedSection } from "./home-screen.helpers";

const FEED_ITEM_ACTION_BORDER_WIDTH = 1;
const FEED_ITEM_ACTION_STROKE_WIDTH = 2;

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
  const textStyle = getFeedSectionTextStyle(section.id);
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
              sectionId={section.id}
              showsActions={showsActions}
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

type HomeFeedItemRowProps = {
  card: HomeFeedCard;
  isLast: boolean;
  isProcessing: boolean;
  onAction: (card: HomeFeedCard, action: CompletionAction) => void;
  sectionId: HomeFeedSection["id"];
  showsActions: boolean;
};

function HomeFeedItemRow({
  card,
  isLast,
  isProcessing,
  onAction,
  sectionId,
  showsActions,
}: HomeFeedItemRowProps): React.JSX.Element {
  const textStyle = getFeedSectionTextStyle(sectionId);
  const actionStyle = getFeedItemActionStyle(sectionId);
  const iconColor = getFeedSectionIconColor(sectionId);
  const metaLine = getFeedItemMetaLine(card);

  return (
    <View
      style={[
        styles.feedItemRow,
        !isLast && getFeedItemDividerStyle(sectionId),
      ]}
    >
      <Pressable
        accessibilityHint="반복 항목 상세 화면으로 이동해요."
        accessibilityLabel={`${card.item.title} 상세 보기`}
        accessibilityRole="button"
        onPress={() => {
          openHomeFeedCard(card);
        }}
        style={({ pressed }) => [
          styles.feedItemCopyButton,
          pressed && styles.feedItemPressed,
        ]}
      >
        <AppText ellipsizeMode="tail" numberOfLines={1} style={textStyle}>
          {card.item.title}
        </AppText>
        <View style={styles.feedItemMetaSlot}>
          <AppText
            ellipsizeMode="tail"
            numberOfLines={1}
            style={textStyle}
            variant="caption"
          >
            {metaLine}
          </AppText>
        </View>
      </Pressable>
      {showsActions ? (
        <View style={styles.feedItemActions}>
          <Pressable
            accessibilityHint="이 일정을 건너뛰어요."
            accessibilityLabel={`${card.item.title} 건너뛰기`}
            accessibilityRole="button"
            accessibilityState={{ disabled: isProcessing }}
            disabled={isProcessing}
            onPress={() => {
              onAction(card, "skipped");
            }}
            style={({ pressed }) => [
              styles.feedItemActionIcon,
              actionStyle,
              isProcessing && styles.feedItemActionDisabled,
              pressed && !isProcessing && styles.feedItemPressed,
            ]}
          >
            <SkipForward
              color={iconColor}
              size={15}
              strokeWidth={FEED_ITEM_ACTION_STROKE_WIDTH}
            />
          </Pressable>
          <Pressable
            accessibilityHint="이 일정을 완료 처리해요."
            accessibilityLabel={`${card.item.title} 완료`}
            accessibilityRole="button"
            accessibilityState={{ disabled: isProcessing }}
            disabled={isProcessing}
            onPress={() => {
              onAction(card, "completed");
            }}
            style={({ pressed }) => [
              styles.feedItemActionIcon,
              actionStyle,
              isProcessing && styles.feedItemActionDisabled,
              pressed && !isProcessing && styles.feedItemPressed,
            ]}
          >
            <Check
              color={iconColor}
              size={16}
              strokeWidth={FEED_ITEM_ACTION_STROKE_WIDTH}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function openHomeFeedCard(card: HomeFeedCard): void {
  router.push({
    params: {
      itemId: card.item.id,
      returnTo: "/home",
      scheduledAtUtc: card.occurrence.scheduledAtUtc,
    },
    pathname: "/items/[itemId]",
  });
}

function getFeedItemMetaLine(card: HomeFeedCard): string {
  return [card.metaLabel, card.timeLabel, card.recurrenceLabel]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
}

function getFeedItemDividerStyle(
  sectionId: HomeFeedSection["id"]
): StyleProp<ViewStyle> {
  return usesLightFeedSectionContent(sectionId)
    ? styles.feedItemDividerLight
    : styles.feedItemDividerDark;
}

function getFeedItemActionStyle(
  sectionId: HomeFeedSection["id"]
): StyleProp<ViewStyle> {
  return usesLightFeedSectionContent(sectionId)
    ? styles.feedItemActionIconLight
    : styles.feedItemActionIconDark;
}

function getFeedSectionIconColor(sectionId: HomeFeedSection["id"]): string {
  return usesLightFeedSectionContent(sectionId) ? color.white : color.jetBlack;
}

function usesLightFeedSectionContent(
  sectionId: HomeFeedSection["id"]
): boolean {
  return sectionId === "upcoming";
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

function getFeedSectionTextStyle(
  sectionId: HomeFeedSection["id"]
): StyleProp<TextStyle> {
  return usesLightFeedSectionContent(sectionId)
    ? styles.feedSectionTextLight
    : styles.feedSectionTextDark;
}

const styles = StyleSheet.create({
  feedSectionCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  feedItemActionIcon: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    borderWidth: FEED_ITEM_ACTION_BORDER_WIDTH,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  feedItemActionDisabled: {
    opacity: 0.42,
  },
  feedItemActionIconDark: {
    borderColor: color.jetBlack,
  },
  feedItemActionIconLight: {
    borderColor: color.white,
  },
  feedItemActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  feedItemCopyButton: {
    flex: 1,
    minWidth: 0,
  },
  feedItemDividerDark: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(41, 43, 45, 0.2)",
  },
  feedItemDividerLight: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.32)",
  },
  feedItemList: {
    marginTop: spacing.xxs,
  },
  feedItemMetaSlot: {
    marginTop: spacing.xxs,
    opacity: 0.72,
  },
  feedItemRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedItemPressed: {
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
