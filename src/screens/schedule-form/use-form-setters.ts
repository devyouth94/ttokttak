import {
  type FieldPath,
  type FieldPathValue,
  useFormContext,
} from "react-hook-form";

import type { ScheduleFormValues } from "./form-values";

export function useScheduleFormSetters() {
  const {
    clearErrors,
    formState: { isSubmitted },
    setValue,
  } = useFormContext<ScheduleFormValues>();

  function setField<Name extends FieldPath<ScheduleFormValues>>(
    name: Name,
    value: FieldPathValue<ScheduleFormValues, Name>
  ): void {
    clearErrors("root");
    setValue(name, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: isSubmitted,
    });
  }

  return { setField };
}
