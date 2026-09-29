import {
  Easing,
  type EntryExitAnimationFunction,
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  withTiming,
} from "react-native-reanimated";

export const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export const FORM_SECTION_ENTER = FadeIn.duration(140)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.Never)
  .build();
export const QUICK_FADE_OUT = FadeOut.duration(120)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.Never)
  .build();
export const LAYOUT_TRANSITION = LinearTransition.duration(180)
  .easing(EASE_IN_OUT)
  .reduceMotion(ReduceMotion.System);
export const MENU_REDUCED_ENTER = FadeIn.duration(120)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.Never)
  .build();

export const MENU_ENTER: EntryExitAnimationFunction = () => {
  "worklet";

  const config = {
    duration: 180,
    easing: EASE_OUT,
    reduceMotion: ReduceMotion.Never,
  };

  return {
    animations: {
      opacity: withTiming(1, config),
      transform: [{ scale: withTiming(1, config) }],
    },
    initialValues: {
      opacity: 0,
      transform: [{ scale: 0.95 }],
    },
  };
};
