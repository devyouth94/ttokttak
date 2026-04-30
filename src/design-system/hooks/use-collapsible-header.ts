import { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

type UseCollapsibleHeaderOptions = {
  animationDuration?: number;
  hiddenOffset?: number;
  scrollThreshold?: number;
};

type UseCollapsibleHeaderResult = {
  headerAnimatedStyle: {
    transform: {
      translateY: Animated.Value;
    }[];
  };
  headerHeight: number;
  onHeaderHeightChange: (height: number) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: 16;
};

const SCROLLABLE_CONTENT_EPSILON = 1;

export function useCollapsibleHeader({
  animationDuration = 180,
  hiddenOffset = 0,
  scrollThreshold = 6,
}: UseCollapsibleHeaderOptions = {}): UseCollapsibleHeaderResult {
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerVisibleRef = useRef(true);
  const previousScrollYRef = useRef(0);
  const [headerHeight, setHeaderHeight] = useState(0);

  const headerAnimatedStyle = useMemo(
    () => ({
      transform: [{ translateY: headerTranslateY }],
    }),
    [headerTranslateY]
  );

  const onHeaderHeightChange = useCallback(
    (nextHeight: number) => {
      setHeaderHeight((previousHeight) =>
        previousHeight === nextHeight ? previousHeight : nextHeight
      );

      if (!headerVisibleRef.current) {
        headerTranslateY.setValue(-(nextHeight + hiddenOffset));
      }
    },
    [headerTranslateY, hiddenOffset]
  );

  const showHeader = useCallback(() => {
    if (headerVisibleRef.current) {
      return;
    }

    headerVisibleRef.current = true;
    Animated.timing(headerTranslateY, {
      duration: animationDuration,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [animationDuration, headerTranslateY]);

  const hideHeader = useCallback(() => {
    if (!headerHeight || !headerVisibleRef.current) {
      return;
    }

    headerVisibleRef.current = false;
    Animated.timing(headerTranslateY, {
      duration: animationDuration,
      toValue: -(headerHeight + hiddenOffset),
      useNativeDriver: true,
    }).start();
  }, [animationDuration, headerHeight, headerTranslateY, hiddenOffset]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const nextScrollY = contentOffset.y;
      const scrollDelta = nextScrollY - previousScrollYRef.current;
      previousScrollYRef.current = nextScrollY;

      const canScrollVertically =
        contentSize.height - layoutMeasurement.height >
        SCROLLABLE_CONTENT_EPSILON;

      if (!canScrollVertically) {
        showHeader();
        return;
      }

      if (nextScrollY <= 0) {
        showHeader();
        return;
      }

      if (scrollDelta > scrollThreshold) {
        hideHeader();
        return;
      }

      if (scrollDelta < -scrollThreshold) {
        showHeader();
      }
    },
    [hideHeader, scrollThreshold, showHeader]
  );

  return {
    headerAnimatedStyle,
    headerHeight,
    onHeaderHeightChange,
    onScroll,
    scrollEventThrottle: 16,
  };
}
