import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Check, SkipForward } from "lucide-react-native";

import { AppText } from "~/design-system/components/app-text";
import { borderRadius, color, spacing } from "~/design-system/tokens";
import type { CompletionAction } from "~/features/recurring/domain/types";

import type { HomeFeedCard } from "./home-screen.helpers";

const FEED_ITEM_ACTION_BORDER_WIDTH = 1;
const FEED_ITEM_ACTION_STROKE_WIDTH = 2;

type HomeFeedItemRowProps = {
  card: HomeFeedCard;
  isLast: boolean;
  isProcessing: boolean;
  onAction: (card: HomeFeedCard, action: CompletionAction) => void;
  showsActions: boolean;
  usesLightContent: boolean;
};

export function HomeFeedItemRow({
  card,
  isLast,
  isProcessing,
  onAction,
  showsActions,
  usesLightContent,
}: HomeFeedItemRowProps): React.JSX.Element {
  const textStyle = usesLightContent
    ? styles.feedSectionTextLight
    : styles.feedSectionTextDark;
  const actionBorderStyle = usesLightContent
    ? styles.feedItemActionIconLight
    : styles.feedItemActionIconDark;
  const dividerStyle = usesLightContent
    ? styles.feedItemDividerLight
    : styles.feedItemDividerDark;
  const iconColor = usesLightContent ? color.white : color.jetBlack;

  return (
    <View style={[styles.feedItemRow, !isLast && dividerStyle]}>
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
            {getFeedItemMetaLine(card)}
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
              actionBorderStyle,
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
              actionBorderStyle,
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

export function getFeedItemMetaLine(card: HomeFeedCard): string {
  const scheduledDateTimeLabel = [card.metaLabel, card.timeLabel]
    .filter((value): value is string => Boolean(value))
    .join(" · ");

  return [scheduledDateTimeLabel, card.recurrenceLabel]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
}

const styles = StyleSheet.create({
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
  feedItemMetaSlot: {
    marginTop: spacing.xxs,
    opacity: 0.72,
  },
  feedItemPressed: {
    opacity: 0.72,
  },
  feedItemRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedSectionTextDark: {
    color: color.jetBlack,
  },
  feedSectionTextLight: {
    color: color.white,
  },
});
