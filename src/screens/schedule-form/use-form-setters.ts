import { useFormContext } from "react-hook-form";

import type { ScheduleFormValues } from "./form-values";

export function useScheduleFormSetters() {
  const {
    clearErrors,
    formState: { isSubmitted },
    setValue,
  } = useFormContext<ScheduleFormValues>();

  function setField<Key extends keyof ScheduleFormValues>(
    name: Key,
    value: ScheduleFormValues[Key]
  ): void {
    clearErrors("root");
    setValue(name, value as never, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: isSubmitted,
    });
  }

  function setFields(patch: Partial<ScheduleFormValues>): void {
    for (const name of Object.keys(patch) as (keyof ScheduleFormValues)[]) {
      const value = patch[name];

      if (value !== undefined) {
        setField(name, value);
      }
    }
  }

  return { setField, setFields };
}
