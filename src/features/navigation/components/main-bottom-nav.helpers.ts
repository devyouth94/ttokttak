import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CommonActions } from "@react-navigation/native";

type MainBottomNavNavigation = {
  dispatch: (
    action: ReturnType<typeof CommonActions.navigate> & { target: string }
  ) => void;
  emit: (options: {
    canPreventDefault: true;
    target: string;
    type: "tabPress";
  }) => { defaultPrevented: boolean };
};

type MainBottomNavRoute = BottomTabBarProps["state"]["routes"][number];

type PressMainBottomNavRouteParams = {
  isFocused: boolean;
  navigation: MainBottomNavNavigation;
  route: MainBottomNavRoute;
  stateKey: string;
};

export function pressMainBottomNavRoute({
  isFocused,
  navigation,
  route,
  stateKey,
}: PressMainBottomNavRouteParams): void {
  const event = navigation.emit({
    canPreventDefault: true,
    target: route.key,
    type: "tabPress",
  });

  if (isFocused || event.defaultPrevented) {
    return;
  }

  navigation.dispatch({
    ...CommonActions.navigate({
      name: route.name,
      params: route.params,
    }),
    target: stateKey,
  });
}
