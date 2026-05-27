import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Check, SkipForward } from "lucide-react-native";

import type { CompletionAction } from "~/entities/schedule";
import { appThemeColors } from "~/shared/theme/app-theme-colors";
import { useAppThemeColors } from "~/shared/theme/theme-context";
import { AppText } from "~/shared/ui/app-text";
import { borderRadius, spacing } from "~/shared/ui/tokens";

import type { HomeFeedCard } from "../model/home-feed-sections";

const FEED_ITEM_ACTION_BORDER_WIDTH = 1;
const FEED_ITEM_ACTION_STROKE_WIDTH = 2;
const feedItemCardTextColor = appThemeColors.light.text;
const feedItemCardBorderColor = appThemeColors.light.primary;
const feedItemCardDividerColor = appThemeColors.light.dividerOnPrimary;

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
  const { t } = useTranslation();
  const themeColors = useAppThemeColors();
  const textColor = usesLightContent
    ? themeColors.primaryForeground
    : feedItemCardTextColor;
  const borderColor = usesLightContent
    ? themeColors.primaryForeground
    : feedItemCardBorderColor;
  const iconColor = textColor;

  return (
    <View
      style={[
        styles.feedItemRow,
        !isLast && {
          borderBottomColor: feedItemCardDividerColor,
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
          style={{ color: textColor }}
        >
          {card.item.title}
        </AppText>
        <View style={styles.feedItemMetaSlot}>
          <AppText
            ellipsizeMode="tail"
            numberOfLines={1}
            style={{ color: textColor }}
            variant="caption"
          >
            {getFeedItemMetaLine(card)}
          </AppText>
        </View>
      </Pressable>
      {showsActions ? (
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
              { borderColor },
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
              { borderColor },
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
