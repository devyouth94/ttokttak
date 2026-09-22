import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { router } from "expo-router";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";

import { useAppLanguage } from "~/i18n/provider";
import { useNotifications } from "~/notifications/provider";
import { getScheduleReturnPath } from "~/route-param";
import { normalizeColorHex } from "~/schedule/display/color";
import { useScheduleById } from "~/schedule/query";
import {
  type AnchorType,
  type RecurrenceType,
  requiresInterval,
  requiresWeekdays,
  supportsCompletion,
} from "~/schedule/rules/recurrence";
import {
  archiveSchedule,
  createSchedule,
  updateSchedule,
} from "~/schedule/write";
import { useSession } from "~/session/provider";

import {
  createFormSchema,
  createFormValues,
  type ScheduleFormValues,
  toFormValues,
  toScheduleInput,
} from "./form-values";
import { useSchedulePicker } from "./picker";

type Params = {
  itemId?: string;
  returnTo?: string;
};

/** 일정 생성·수정 화면의 폼 값, 날짜 선택기와 저장 동작을 제공한다. */
export function useScheduleForm({ itemId, returnTo }: Params) {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const { syncNotifications } = useNotifications();
  const { profile, user } = useSession();

  const isEdit = Boolean(itemId);
  const schedule = useScheduleById(isEdit ? (itemId ?? null) : null);

  const [openedAt] = useState(() => new Date());
  const today = format(openedAt, "yyyy-MM-dd");

  const [defaults] = useState(() =>
    schedule.item ? toFormValues(schedule.item) : createFormValues(openedAt)
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minimumStartDate = schedule.item?.startDateLocal ?? today;

  const schema = useMemo(
    () => createFormSchema({ isEdit, language, today }),
    [isEdit, language, today]
  );

  const {
    control,
    formState: { errors: formErrors, isSubmitted, submitCount },
    getValues,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<ScheduleFormValues>({
    defaultValues: defaults,
    mode: "onSubmit",
    reValidateMode: "onChange",
    resolver: standardSchemaResolver(schema),
  });

  const values = watch();

  function fieldError(name: keyof ScheduleFormValues): string | undefined {
    const message = formErrors[name]?.message;

    return typeof message === "string" ? message : undefined;
  }

  function setField<Key extends keyof ScheduleFormValues>(
    name: Key,
    value: ScheduleFormValues[Key]
  ): void {
    setError(null);
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

  // 반복 유형을 바꿀 때 더 이상 유효하지 않은 부가 옵션도 함께 정리한다.
  function selectRecurrence(recurrenceType: RecurrenceType): void {
    const current = getValues();
    const needsWeekdays = requiresWeekdays(recurrenceType);

    if (recurrenceType === "once") {
      picker.closeEndDate();
    }

    setFields({
      anchorType: supportsCompletion(recurrenceType)
        ? current.anchorType
        : "fixed",
      endDateLocal:
        recurrenceType === "once" || current.recurrenceType === "once"
          ? null
          : current.endDateLocal,
      intervalValue: requiresInterval(recurrenceType)
        ? current.intervalValue || "1"
        : "",
      recurrenceType,
      weekdayMask: needsWeekdays
        ? current.weekdayMask.length > 0
          ? current.weekdayMask
          : weekdayFrom(current.startDateLocal)
        : [],
    });
  }

  function changeStartDate(nextDate: string): void {
    if (isEdit) {
      return;
    }

    const current = getValues();
    const startDateLocal =
      nextDate < minimumStartDate ? minimumStartDate : nextDate;

    setFields({
      endDateLocal:
        current.endDateLocal != null && current.endDateLocal < startDateLocal
          ? startDateLocal
          : current.endDateLocal,
      startDateLocal,
      weekdayMask:
        requiresWeekdays(current.recurrenceType) &&
        current.weekdayMask.length === 0
          ? weekdayFrom(startDateLocal)
          : current.weekdayMask,
    });
  }

  const minimumEndDate = isEdit
    ? values.startDateLocal > today
      ? values.startDateLocal
      : today
    : values.startDateLocal;

  function changeEndDate(nextDate: string): void {
    setField(
      "endDateLocal",
      nextDate < minimumEndDate ? minimumEndDate : nextDate
    );
  }

  function enableEndDate(): void {
    setField("endDateLocal", minimumEndDate);
  }

  function disableEndDate(): void {
    picker.closeEndDate();
    setField("endDateLocal", null);
  }

  function toggleWeekday(weekday: number): void {
    setField(
      "weekdayMask",
      values.weekdayMask.includes(weekday)
        ? values.weekdayMask.filter((value) => value !== weekday)
        : [...values.weekdayMask, weekday]
    );
  }

  function selectAnchorType(anchorType: AnchorType): void {
    if (
      anchorType === "completion_based" &&
      !supportsCompletion(values.recurrenceType)
    ) {
      return;
    }

    setField("anchorType", anchorType);
  }

  const picker = useSchedulePicker({
    endDateLocal: values.endDateLocal,
    isStartDateEditable: !isEdit,
    minimumEndDateLocal: minimumEndDate,
    minimumStartDateLocal: minimumStartDate,
    reminderTimeLocal: values.reminderTimeLocal,
    startDateLocal: values.startDateLocal,
    onChangeEndDate: changeEndDate,
    onChangeReminderTime: (time) => setField("reminderTimeLocal", time),
    onChangeStartDate: changeStartDate,
  });

  function back(): void {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  }

  function submit(): void {
    void handleSubmit(save, () => {
      setError(t("scheduleForm.error.checkInput"));
    })();
  }

  async function save(formValues: ScheduleFormValues): Promise<void> {
    if (!profile || !user) {
      Alert.alert(
        t("scheduleForm.saveUnavailable.title"),
        t("scheduleForm.saveUnavailable.message")
      );
      return;
    }

    const input = toScheduleInput(formValues);

    setIsSaving(true);
    setError(null);

    try {
      if (isEdit && itemId) {
        await updateSchedule({
          itemId,
          patch: {
            anchorType: input.anchorType,
            colorHex: input.colorHex,
            description: input.description,
            endDateLocal: input.endDateLocal,
            intervalValue: input.intervalValue,
            notificationsEnabled: input.notificationsEnabled,
            recurrenceType: input.recurrenceType,
            reminderTimeLocal: input.reminderTimeLocal,
            title: input.title,
            weekdayMask: input.weekdayMask,
          },
          syncNotifications,
          timezone: schedule.timezone,
          userId: user.id,
        });
      } else {
        await createSchedule({
          input,
          syncNotifications,
          timezone: schedule.timezone,
          userId: user.id,
        });
      }

      router.replace(getScheduleReturnPath(returnTo));
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  function remove(): void {
    if (!isEdit || !itemId || !user) {
      return;
    }

    Alert.alert(
      t("scheduleForm.deleteAlert.title"),
      t("scheduleForm.deleteAlert.message"),
      [
        {
          style: "cancel",
          text: t("scheduleForm.deleteAlert.cancel"),
        },
        {
          style: "destructive",
          text: t("scheduleForm.deleteAlert.confirm"),
          onPress: () => void confirmRemove(itemId),
        },
      ]
    );
  }

  async function confirmRemove(currentItemId: string): Promise<void> {
    setIsDeleting(true);
    setError(null);

    try {
      await archiveSchedule({
        itemId: currentItemId,
        syncNotifications,
      });

      router.replace("/");
    } catch (removeError) {
      setError(errorMessage(removeError));
    } finally {
      setIsDeleting(false);
    }
  }

  // query 결과가 도착하면 수정할 일정으로 폼 기본값을 교체한다.
  useEffect(() => {
    if (!isEdit || !schedule.item) {
      return;
    }

    reset(toFormValues(schedule.item));
  }, [isEdit, reset, schedule.item]);

  const loadError =
    isEdit && !schedule.isLoading
      ? schedule.error
        ? errorMessage(schedule.error)
        : !schedule.isReady
          ? t("scheduleForm.error.editLoadFailed")
          : null
      : null;

  return {
    actions: {
      field: {
        onChangeDescription: (value: string) => setField("description", value),
        onChangeTitle: (value: string) => setField("title", value),
        onSelectColor: (colorHex: string) =>
          setField("colorHex", normalizeColorHex(colorHex)),
        onToggleNotifications: (value: boolean) =>
          setField("notificationsEnabled", value),
      },
      picker: picker.actions,
      recurrence: {
        onChangeIntervalValue: (value: string) =>
          setField("intervalValue", value.replace(/[^0-9]/g, "")),
        onDisableEndDate: disableEndDate,
        onEnableEndDate: enableEndDate,
        onSelectAnchorType: selectAnchorType,
        onSelectRecurrence: selectRecurrence,
        onToggleWeekday: toggleWeekday,
      },
      screen: {
        onBack: back,
        onDelete: remove,
        onSubmit: submit,
      },
    },
    control,
    errors: {
      anchor: fieldError("anchorType"),
      endDate: fieldError("endDateLocal"),
      interval: fieldError("intervalValue"),
      reminderTime: fieldError("reminderTimeLocal"),
      startDate: fieldError("startDateLocal"),
      title: fieldError("title"),
      weekday: fieldError("weekdayMask"),
    },
    picker: picker.state,
    state: {
      error: error ?? loadError,
      isDeleting,
      isEdit,
      isLoading: isEdit && schedule.isLoading,
      isSaving,
      isStartDateEditable: !isEdit,
      submitCount,
    },
    values,
  } as const;
}

function weekdayFrom(localDate: string): number[] {
  return [parse(localDate, "yyyy-MM-dd", new Date()).getDay()];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
