import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Check, SkipForward } from "lucide-react-native";

import type { OccurrenceAction } from "~/schedule/rules/occurrence";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing } from "~/ui/tokens";

import { homeFeedCardPalette } from "./home-feed-card-palette";
import type { HomeFeedCard } from "../model/home-feed-sections";

const FEED_ITEM_ACTION_BORDER_WIDTH = 1;
const FEED_ITEM_ACTION_STROKE_WIDTH = 2;

type HomeFeedItemRowProps = {
  card: HomeFeedCard;
  isLast: boolean;
  isProcessing: boolean;
  onAction: (card: HomeFeedCard, action: OccurrenceAction) => void;
  showsActions: boolean;
};

export function HomeFeedItemRow({
  card,
  isLast,
  isProcessing,
  onAction,
  showsActions,
}: HomeFeedItemRowProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.feedItemRow,
        !isLast && {
          borderBottomColor: homeFeedCardPalette.divider,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Pressable
        accessibilityHint={t("home.feed.itemDetailHint")}
        accessibilityLabel={t("home.feed.itemDetailLabel", {
          title: card.item.title,
        })}
        accessibilityRole="button"
        onPress={() => {
          openHomeFeedCard(card);
        }}
        style={({ pressed }) => [
          styles.feedItemCopyButton,
          pressed && styles.feedItemPressed,
        ]}
      >
        <AppText
          ellipsizeMode="tail"
          numberOfLines={1}
          style={{ color: homeFeedCardPalette.text }}
        >
          {card.item.title}
        </AppText>
        <View style={styles.feedItemMetaSlot}>
          <AppText
            ellipsizeMode="tail"
            numberOfLines={1}
            style={{ color: homeFeedCardPalette.text }}
            variant="caption"
          >
            {getFeedItemMetaLine(card)}
          </AppText>
        </View>
      </Pressable>
      {showsActions && (
        <View style={styles.feedItemActions}>
          <Pressable
            accessibilityHint={t("home.feed.skipHint")}
            accessibilityLabel={t("home.feed.skipLabel", {
              title: card.item.title,
            })}
            accessibilityRole="button"
            accessibilityState={{ disabled: isProcessing }}
            disabled={isProcessing}
            onPress={() => {
              onAction(card, "skipped");
            }}
            style={({ pressed }) => [
              styles.feedItemActionIcon,
              { borderColor: homeFeedCardPalette.actionBorder },
              isProcessing && styles.feedItemActionDisabled,
              pressed && !isProcessing && styles.feedItemPressed,
            ]}
          >
            <SkipForward
              color={homeFeedCardPalette.text}
              size={15}
              strokeWidth={FEED_ITEM_ACTION_STROKE_WIDTH}
            />
          </Pressable>
          <Pressable
            accessibilityHint={t("home.feed.completeHint")}
            accessibilityLabel={t("home.feed.completeLabel", {
              title: card.item.title,
            })}
            accessibilityRole="button"
            accessibilityState={{ disabled: isProcessing }}
            disabled={isProcessing}
            onPress={() => {
              onAction(card, "completed");
            }}
            style={({ pressed }) => [
              styles.feedItemActionIcon,
              { borderColor: homeFeedCardPalette.actionBorder },
              isProcessing && styles.feedItemActionDisabled,
              pressed && !isProcessing && styles.feedItemPressed,
            ]}
          >
            <Check
              color={homeFeedCardPalette.text}
              size={16}
              strokeWidth={FEED_ITEM_ACTION_STROKE_WIDTH}
            />
          </Pressable>
        </View>
      )}
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
  feedItemActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  feedItemCopyButton: {
    flex: 1,
    minWidth: 0,
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
});
