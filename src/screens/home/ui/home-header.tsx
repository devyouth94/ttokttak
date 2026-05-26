import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { AppText } from "~/shared/ui/app-text";
import { colors } from "~/shared/ui/tokens";

type HomeHeaderProps = {
  profileName: string;
};

export function HomeHeader({
  profileName,
}: HomeHeaderProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <AppText
          ellipsizeMode="tail"
          numberOfLines={2}
          style={styles.headerTitle}
          variant="display"
        >
          {t("home.header.greeting", { name: profileName })}
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
