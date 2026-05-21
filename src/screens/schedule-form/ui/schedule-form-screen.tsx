import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "~/shared/ui/app-text";
import { colors } from "~/shared/ui/tokens";

import { ScheduleFormScreenContent } from "./schedule-form-screen-content";
import { styles } from "./schedule-form-screen-styles";
import { getIosPickerChangeHandler } from "../model/schedule-form-screen-model";
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
  const iosPickerChangeHandler = getIosPickerChangeHandler(
    screenModel.picker.iosMode,
    screenModel.picker.iosDateTarget,
    {
      onEndDateChange: screenModel.actions.picker.onEndDatePickerChange,
      onStartDateChange: screenModel.actions.picker.onStartDatePickerChange,
      onTimeChange: screenModel.actions.picker.onTimePickerChange,
    }
  );

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
  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.safeArea}
    >
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText style={styles.loadingText}>
          항목 정보를 불러오는 중입니다.
        </AppText>
      </View>
    </SafeAreaView>
  );
}
