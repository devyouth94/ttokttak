import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  type EntryExitAnimationFunction,
  ReduceMotion,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Check, SkipForward } from "lucide-react-native";

import { getScheduleDisplayTitle } from "~/schedule/display/label";
import type { OccurrenceAction } from "~/schedule/model";
import { AppText } from "~/ui/app-text";
import { EASE_OUT, LAYOUT_TRANSITION, QUICK_FADE_OUT } from "~/ui/motion";
import { borderRadius, spacing } from "~/ui/tokens";

import { homeFeedCardPalette } from "./home-feed-card-palette";
import type { HomeFeedCard } from "../presentation";

const ACTION_BORDER_WIDTH = 1;
const ACTION_STROKE_WIDTH = 2;
const ITEM_EXIT: EntryExitAnimationFunction = () => {
  "worklet";

  const config = {
    duration: 180,
    easing: EASE_OUT,
    reduceMotion: ReduceMotion.Never,
  };

  return {
    animations: {
      opacity: withTiming(0, config),
      transform: [{ translateY: withTiming(-6, config) }],
    },
    initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
  };
};
type HomeFeedItemProps = {
  card: HomeFeedCard;
  isLast: boolean;
  onAction: (card: HomeFeedCard, action: OccurrenceAction) => void;
  showsActions: boolean;
};

/** 홈 피드 카드 한 항목과 사용 가능한 처리 동작을 표시한다. */
export function HomeFeedItem({
  card,
  isLast,
  onAction,
  showsActions,
}: HomeFeedItemProps): React.JSX.Element {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  const submittedActionRef = useRef<OccurrenceAction | null>(null);
  const [pendingAction, setPendingAction] = useState<OccurrenceAction | null>(
    null
  );

  const title = getScheduleDisplayTitle(
    card.item,
    t("schedule.contentUnavailableTitle")
  );

  function startAction(action: OccurrenceAction): void {
    if (pendingAction) {
      return;
    }

    if (action === "completed") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setPendingAction(action);
  }

  useEffect(() => {
    if (!pendingAction || submittedActionRef.current) {
      return;
    }

    submittedActionRef.current = pendingAction;
    onAction(card, pendingAction);
  }, [card, onAction, pendingAction]);

  return (
    <Animated.View
      exiting={
        pendingAction ? (reducedMotion ? QUICK_FADE_OUT : ITEM_EXIT) : undefined
      }
      layout={LAYOUT_TRANSITION}
      pointerEvents={pendingAction ? "none" : "auto"}
      style={[
        styles.row,
        !isLast && {
          borderBottomColor: homeFeedCardPalette.divider,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Pressable
        accessibilityHint={t("home.feed.itemDetailHint")}
        accessibilityLabel={t("home.feed.itemDetailLabel", {
          title,
        })}
        accessibilityRole="button"
        onPress={() => {
          openDetails(card);
        }}
        style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}
      >
        <AppText
          ellipsizeMode="tail"
          numberOfLines={1}
          style={{ color: homeFeedCardPalette.text }}
        >
          {title}
        </AppText>
        <View style={styles.meta}>
          <AppText
            ellipsizeMode="tail"
            numberOfLines={1}
            style={{ color: homeFeedCardPalette.text }}
            variant="caption"
          >
            {card.metaLine}
          </AppText>
        </View>
      </Pressable>
      {showsActions && (
        <View style={styles.actions}>
          <Pressable
            accessibilityHint={t("home.feed.skipHint")}
            accessibilityLabel={t("home.feed.skipLabel", {
              title,
            })}
            accessibilityRole="button"
            hitSlop={5}
            onPress={() => {
              startAction("skipped");
            }}
            pressRetentionOffset={12}
            style={({ pressed }) => [
              styles.actionIcon,
              { borderColor: homeFeedCardPalette.actionBorder },
              pressed && styles.pressed,
            ]}
          >
            <SkipForward
              color={homeFeedCardPalette.text}
              size={15}
              strokeWidth={ACTION_STROKE_WIDTH}
            />
          </Pressable>
          <Pressable
            accessibilityHint={t("home.feed.completeHint")}
            accessibilityLabel={t("home.feed.completeLabel", {
              title,
            })}
            accessibilityRole="button"
            hitSlop={5}
            onPress={() => {
              startAction("completed");
            }}
            pressRetentionOffset={12}
            style={({ pressed }) => [
              styles.actionIcon,
              { borderColor: homeFeedCardPalette.actionBorder },
              pressed && styles.pressed,
            ]}
          >
            <Check
              color={homeFeedCardPalette.text}
              size={16}
              strokeWidth={ACTION_STROKE_WIDTH}
            />
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

function openDetails(card: HomeFeedCard): void {
  router.push({
    params: {
      itemId: card.item.id,
      returnTo: "/home",
      scheduledAtUtc: card.occurrence.scheduledAtUtc,
    },
    pathname: "/items/[itemId]",
  });
}

const styles = StyleSheet.create({
  actionIcon: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    borderWidth: ACTION_BORDER_WIDTH,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  copyButton: {
    flex: 1,
    minWidth: 0,
  },
  meta: {
    marginTop: spacing.xxs,
    opacity: 0.72,
  },
  pressed: {
    opacity: 0.72,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
});
