import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal, Pressable, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  type EntryAnimationsValues,
  type EntryExitAnimationFunction,
  type ExitAnimationsValues,
  FadeIn,
  FadeOut,
  ReduceMotion,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useThemeColors } from "~/theme/provider";

import { EASE_OUT, EASE_SHEET } from "./motion";
import { borderRadius, spacing } from "./tokens";

const BACKDROP_ENTER = FadeIn.duration(200)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.Never)
  .build();
const BACKDROP_EXIT = FadeOut.duration(150)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.Never)
  .build();
const SHEET_ENTER: EntryExitAnimationFunction = (
  values: EntryAnimationsValues
) => {
  "worklet";

  return {
    animations: {
      transform: [
        {
          translateY: withTiming(0, {
            duration: 240,
            easing: EASE_SHEET,
            reduceMotion: ReduceMotion.Never,
          }),
        },
      ],
    },
    initialValues: { transform: [{ translateY: values.windowHeight }] },
  };
};
const REDUCED_SHEET_ENTER = FadeIn.duration(160)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.Never)
  .build();

type BottomSheetModalProps = {
  children: ReactNode;
  onClose: () => void;
  visible: boolean;
};

export function BottomSheetModal({
  children,
  onClose,
  visible,
}: BottomSheetModalProps): React.JSX.Element | null {
  const themeColors = useThemeColors();
  const reducedMotion = useReducedMotion();

  const visibleRef = useRef(visible);
  const [mounted, setMounted] = useState(visible);

  const finishExit = useCallback((): void => {
    if (!visibleRef.current) {
      setMounted(false);
    }
  }, []);
  const sheetExit = useMemo<EntryExitAnimationFunction>(
    () => (values: ExitAnimationsValues) => {
      "worklet";

      const finish = (finished?: boolean): void => {
        "worklet";

        if (finished) {
          scheduleOnRN(finishExit);
        }
      };

      if (reducedMotion) {
        return {
          animations: {
            opacity: withTiming(
              0,
              {
                duration: 120,
                easing: EASE_OUT,
                reduceMotion: ReduceMotion.Never,
              },
              finish
            ),
          },
          initialValues: { opacity: 1 },
        };
      }

      return {
        animations: {
          transform: [
            {
              translateY: withTiming(
                values.windowHeight,
                {
                  duration: 200,
                  easing: EASE_OUT,
                  reduceMotion: ReduceMotion.Never,
                },
                finish
              ),
            },
          ],
        },
        initialValues: { transform: [{ translateY: 0 }] },
      };
    },
    [finishExit, reducedMotion]
  );

  useEffect(() => {
    visibleRef.current = visible;

    if (visible) {
      setMounted(true);
    }
  }, [visible]);

  if (!mounted) {
    return null;
  }

  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible>
      <GestureHandlerRootView style={styles.root}>
        {visible && (
          <>
            <Animated.View
              entering={BACKDROP_ENTER}
              exiting={BACKDROP_EXIT}
              style={StyleSheet.absoluteFill}
            >
              <Pressable
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                onPress={onClose}
                style={[
                  styles.backdrop,
                  { backgroundColor: themeColors.scrim },
                ]}
              />
            </Animated.View>

            <Animated.View
              accessibilityViewIsModal
              entering={reducedMotion ? REDUCED_SHEET_ENTER : SHEET_ENTER}
              exiting={sheetExit}
              style={[styles.card, { backgroundColor: themeColors.background }]}
            >
              {children}
            </Animated.View>
          </>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  card: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
