import type { StyleProp, ViewStyle } from "react-native";

import type { HomeFeedSection } from "../model/home-feed-sections";

export const homeFeedCardPalette = {
  actionBorder: "#292B2D",
  divider: "rgba(28, 31, 35, 0.4)",
  mutedText: "#8A9099",
  sectionBackground: {
    overdue: "#F8DCD7",
    "selected-date": "#DDEEDD",
    upcoming: "#F6E8C8",
  },
  text: "#1C1F23",
} as const;

export function getHomeFeedSectionCardStyle(
  sectionId: HomeFeedSection["id"]
): StyleProp<ViewStyle> {
  return {
    backgroundColor: homeFeedCardPalette.sectionBackground[sectionId],
  };
}
