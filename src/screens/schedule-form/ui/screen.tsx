import { FormProvider } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { AppScreen } from "~/ui/app-screen";
import { FocusScreenHeader } from "~/ui/focus-screen-header";
import { StateMessage } from "~/ui/state-message";

import { ScheduleFormBody } from "./screen-body";
import { ScheduleFormLoading } from "./screen-loading";
import { useScheduleForm } from "../form";

type ScheduleFormScreenProps = {
  itemId?: string;
  returnTo?: string;
};

export function ScheduleFormScreen({
  itemId,
  returnTo,
}: ScheduleFormScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const scheduleForm = useScheduleForm({ itemId, returnTo });

  if (scheduleForm.isLoading) {
    return <ScheduleFormLoading />;
  }

  if (scheduleForm.loadFailed) {
    return (
      <AppScreen>
        <FocusScreenHeader
          onBack={goBackOrHome}
          title={t("scheduleForm.title.edit")}
        />
        <StateMessage
          action={{
            accessibilityHint: t("scheduleForm.error.retryHint"),
            label: t("scheduleForm.error.retryLabel"),
            onPress: () => {
              void scheduleForm.retryLoad();
            },
          }}
          description={t("error.tryAgain")}
          title={t("scheduleForm.error.editLoadFailed")}
        />
      </AppScreen>
    );
  }

  return (
    <FormProvider {...scheduleForm.form}>
      <ScheduleFormBody
        onBack={goBackOrHome}
        isDeleting={scheduleForm.isDeleting}
        isEdit={scheduleForm.isEdit}
        remove={scheduleForm.remove}
        submit={scheduleForm.submit}
        today={scheduleForm.today}
      />
    </FormProvider>
  );
}

function goBackOrHome(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace("/");
}
