import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { MainBottomNav } from "~/features/navigation/components/main-bottom-nav";

type MainTabShellProps = PropsWithChildren<{
  showBottomNav?: boolean;
}>;

export function MainTabShell({
  children,
  showBottomNav = true,
}: MainTabShellProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>
      {showBottomNav ? <MainBottomNav /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
