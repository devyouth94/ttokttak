import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";

import { MAIN_BOTTOM_NAV_RESERVED_HEIGHT } from "~/ui/main-bottom-nav";

type HomeFeedLayout = {
  bottomInset: number;
  feedHeight: number;
  measureScreen: (event: LayoutChangeEvent) => void;
  measureTop: (event: LayoutChangeEvent) => void;
};

/**
 * 현재 홈 카드 배치를 유지하는 데 필요한 세로 길이를 계산한다.
 * 카드 배치가 일반 흐름으로 바뀌면 높이 측정과 함께 삭제한다.
 */
export function useHomeFeedLayout(safeAreaBottom: number): HomeFeedLayout {
  const [screenHeight, setScreenHeight] = useState(0);
  const [topHeight, setTopHeight] = useState(0);
  const bottomInset = MAIN_BOTTOM_NAV_RESERVED_HEIGHT + safeAreaBottom;
  const feedHeight = Math.floor(
    Math.max(screenHeight - topHeight - bottomInset, 0)
  );

  return {
    bottomInset,
    feedHeight,
    measureScreen: ({ nativeEvent }: LayoutChangeEvent) => {
      setScreenHeight((current) =>
        current === nativeEvent.layout.height
          ? current
          : nativeEvent.layout.height
      );
    },
    measureTop: ({ nativeEvent }: LayoutChangeEvent) => {
      setTopHeight((current) =>
        current === nativeEvent.layout.height
          ? current
          : nativeEvent.layout.height
      );
    },
  };
}
