import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "~/design-system/components/app-text";
import { colors } from "~/design-system/tokens";

import { useRecurringItemFormScreenController } from "./recurring-item-form-screen.controller";
import { getIosPickerChangeHandler } from "./recurring-item-form-screen.helpers";
import { styles } from "./recurring-item-form-screen.styles";
import { RecurringItemFormScreenContent } from "./recurring-item-form-screen-content";

type RecurringItemFormScreenProps = {
  itemId?: string;
  returnTo?: string;
};

export function RecurringItemFormScreen({
  itemId,
  returnTo,
}: RecurringItemFormScreenProps): React.JSX.Element {
  const screenModel = useRecurringItemFormScreenController({
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
    return <RecurringItemFormScreenLoading />;
  }

  return (
    <RecurringItemFormScreenContent
      {...screenModel}
      iosPickerChangeHandler={iosPickerChangeHandler}
    />
  );
}

function RecurringItemFormScreenLoading(): React.JSX.Element {
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
