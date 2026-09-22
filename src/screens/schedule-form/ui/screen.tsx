import { FormProvider } from "react-hook-form";
import { router } from "expo-router";

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
  const scheduleForm = useScheduleForm({ itemId, returnTo });

  if (scheduleForm.isLoading) {
    return <ScheduleFormLoading />;
  }

  return (
    <FormProvider {...scheduleForm.form}>
      <ScheduleFormBody
        onBack={goBackOrHome}
        isDeleting={scheduleForm.isDeleting}
        isEdit={scheduleForm.isEdit}
        loadError={scheduleForm.loadError}
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
