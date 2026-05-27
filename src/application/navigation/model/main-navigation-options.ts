type ThemeStackScreenOptionsInput = {
  backgroundColor: string;
};

export const mainTabsRootScreenOptions = {
  gestureEnabled: false,
} as const;

export const mainTabStackScreenOptions = {
  animation: "default",
  gestureEnabled: false,
  headerShown: false,
} as const;

export function createMainTabStackScreenOptions({
  backgroundColor,
}: ThemeStackScreenOptionsInput) {
  return {
    ...mainTabStackScreenOptions,
    contentStyle: {
      backgroundColor,
    },
  } as const;
}

export function createItemsStackScreenOptions({
  backgroundColor,
}: ThemeStackScreenOptionsInput) {
  return {
    animation: "default",
    contentStyle: {
      backgroundColor,
    },
    headerShown: false,
  } as const;
}
