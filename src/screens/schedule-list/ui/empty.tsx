import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";

import { useAppThemeColors } from "~/shared/theme";
import { StateMessage } from "~/ui/state-message";

export function ListEmpty(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useAppThemeColors();

  return (
    <StateMessage
      action={{
        accessibilityHint: t("scheduleList.empty.createHint"),
        accessibilityLabel: t("scheduleList.empty.createLabel"),
        icon: <Plus color={themeColors.text} size={16} />,
        label: t("scheduleList.empty.createLabel"),
        onPress: () => {
          router.push({
            params: { returnTo: "/schedule" },
            pathname: "/items/new",
          });
        },
      }}
      style={styles.message}
      title={t("scheduleList.empty.title")}
    />
  );
}

const styles = StyleSheet.create({
  message: {
    minHeight: 240,
  },
});
