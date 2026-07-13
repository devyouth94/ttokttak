import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppThemeColors } from "~/shared/theme";
import { AppText } from "~/shared/ui/app-text";

import { ScheduleFormScreenContent } from "./schedule-form-screen-content";
import { useScheduleFormScreenStyles } from "./schedule-form-screen-styles";
import { useScheduleFormScreenController } from "../model/use-schedule-form-screen-controller";

type ScheduleFormScreenProps = {
  itemId?: string;
  returnTo?: string;
};

export function ScheduleFormScreen({
  itemId,
  returnTo,
}: ScheduleFormScreenProps): React.JSX.Element {
  const screenModel = useScheduleFormScreenController({
    itemId,
    returnTo,
  });
  const iosPickerChangeHandler =
    screenModel.picker.iosMode === "time"
      ? screenModel.actions.picker.onTimePickerChange
      : screenModel.picker.iosDateTarget === "endDate"
        ? screenModel.actions.picker.onEndDatePickerChange
        : screenModel.actions.picker.onStartDatePickerChange;

  if (screenModel.view.isBootstrapping) {
    return <ScheduleFormScreenLoading />;
  }

  return (
    <ScheduleFormScreenContent
      {...screenModel}
      iosPickerChangeHandler={iosPickerChangeHandler}
    />
  );
}

function ScheduleFormScreenLoading(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useAppThemeColors();
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
