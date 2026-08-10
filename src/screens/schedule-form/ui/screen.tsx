import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";

import { ScheduleFormScreenContent } from "./content";
import { useScheduleFormScreenStyles } from "./styles";
import { useScheduleForm } from "../form";

type ScheduleFormScreenProps = {
  itemId?: string;
  returnTo?: string;
};

export function ScheduleFormScreen({
  itemId,
  returnTo,
}: ScheduleFormScreenProps): React.JSX.Element {
  const form = useScheduleForm({
    itemId,
    returnTo,
  });

  if (form.state.isLoading) {
    return <ScheduleFormScreenLoading />;
  }

  return <ScheduleFormScreenContent {...form} />;
}

function ScheduleFormScreenLoading(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const styles = useScheduleFormScreenStyles();

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.safeArea}
    >
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={themeColors.primary} size="large" />
        <AppText style={styles.loadingText}>
          {t("scheduleForm.loading")}
        </AppText>
      </View>
    </SafeAreaView>
  );
}
