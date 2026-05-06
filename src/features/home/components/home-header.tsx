import { StyleSheet, View } from "react-native";

import { AppText } from "~/design-system/components/app-text";
import { colors } from "~/design-system/tokens";

type HomeHeaderProps = {
  profileName: string;
};

export function HomeHeader({
  profileName,
}: HomeHeaderProps): React.JSX.Element {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <AppText
          ellipsizeMode="tail"
          numberOfLines={2}
          style={styles.headerTitle}
          variant="display"
        >
          {"안녕하세요,\n"}
          {profileName}
          {"님!"}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    minHeight: 76,
    width: "100%",
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: colors.text,
  },
});
