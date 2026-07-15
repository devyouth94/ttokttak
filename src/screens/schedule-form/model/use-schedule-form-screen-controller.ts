import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, Platform } from "react-native";
import { router } from "expo-router";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { useSession } from "~/application/session";
import {
  type AnchorType,
  type RecurrenceType,
  type RecurringItemColorKey,
} from "~/entities/schedule";
import { supportsCompletionBased } from "~/entities/schedule";
import { getRecurringItemById } from "~/entities/schedule/api";
import {
  archiveSchedule,
  createSchedule,
  updateSchedule,
} from "~/features/mutate-schedule";
import { useAppLanguage } from "~/shared/i18n";

import {
  createDefaultFormState,
  createRecurringItemFormSchema,
  type DatePickerTarget,
  formatDateToLocalDate,
  formatDateToLocalTime,
  getCustomRecurrenceType,
  getMinimumEndDateLocal,
  getMinimumStartDateLocal,
  getNextEndDateDisabledFormState,
  getNextEndDateEnabledFormState,
  getNextEndDateSelectionFormState,
  getNextRecurrenceFormState,
  getNextStartDateSelectionFormState,
  getSanitizedIntervalInput,
  getScheduleFormIosPickerValue,
  getScheduleFormPickerDates,
  getTodayLocalDate,
  type RecurringItemFormValues,
  toDraft,
  toFormState,
  toggleWeekdayMask,
} from "./schedule-form-state";

type UseScheduleFormScreenControllerParams = {
  itemId?: string;
  returnTo?: string;
};

type ActivePicker =
  | { mode: "date"; target: DatePickerTarget }
  | { mode: "time" };

export function useScheduleFormScreenController({
  itemId,
  returnTo,
}: UseScheduleFormScreenControllerParams) {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const isEditMode = Boolean(itemId);
  const todayLocalDate = getTodayLocalDate();
  const { isAuthenticated, isLoading, profile, user } = useSession();
  const [requestState, setRequestState] = useState({
    isBootstrapping: isEditMode,
    isDeleting: false,
    isSaving: false,
    screenError: null as string | null,
  });
  const [minimumStartDateLocal, setMinimumStartDateLocal] = useState(
    getMinimumStartDateLocal({
      isEditMode,
      todayLocalDate,
    })
  );
  const [activePicker, setActivePicker] = useState<ActivePicker | null>(null);
  const [iosPickerValue, setIosPickerValue] = useState(new Date());
  const { isBootstrapping, isDeleting, isSaving, screenError } = requestState;

  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const defaultValues = createDefaultFormState();
  const formSchema = useMemo(
    () =>
      createRecurringItemFormSchema({
        isEditMode,
        language,
        todayLocalDate,
        timezone,
      }),
    [isEditMode, language, timezone, todayLocalDate]
  );

  const {
    control,
    formState: { errors, isSubmitted, submitCount },
    getValues,
    handleSubmit,
    reset,
    setValue,
  } = useForm<RecurringItemFormValues>({
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
    resolver: standardSchemaResolver(formSchema),
  });

  const formValues = useWatch({
    control,
    defaultValue: defaultValues,
  });
  const {
    anchorType = defaultValues.anchorType,
    colorKey = defaultValues.colorKey,
    endDateLocal = defaultValues.endDateLocal,
    intervalValue = defaultValues.intervalValue,
    notificationsEnabled = defaultValues.notificationsEnabled,
    recurrenceType = defaultValues.recurrenceType,
    reminderTimeLocal = defaultValues.reminderTimeLocal,
    startDateLocal = defaultValues.startDateLocal,
    weekdayMask = defaultValues.weekdayMask,
  } = formValues;
  const completionBasedEnabled = supportsCompletionBased(recurrenceType);

  function getErrorMessage(
    name: keyof RecurringItemFormValues
  ): string | undefined {
    const message = errors[name]?.message;

    return typeof message === "string" ? message : undefined;
  }

  function clearScreenError(): void {
    setRequestState((current) => ({
      ...current,
      screenError: null,
    }));
  }

  function setField<Key extends keyof RecurringItemFormValues>(
    name: Key,
    value: RecurringItemFormValues[Key]
  ): void {
    clearScreenError();
    setValue(name, value as never, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: isSubmitted,
    });
  }

  function setFields(nextValues: Partial<RecurringItemFormValues>): void {
    const nextFieldNames = Object.keys(
      nextValues
    ) as (keyof RecurringItemFormValues)[];

    for (const name of nextFieldNames) {
      const value = nextValues[name];

      if (value !== undefined) {
        setField(name, value);
      }
    }
  }

  function closeEndDatePicker(): void {
    setActivePicker((current) =>
      current?.mode === "date" && current.target === "endDate" ? null : current
    );
  }

  function handleBack(): void {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  }

  function handleSelectRecurrence(nextRecurrenceType: RecurrenceType): void {
    if (nextRecurrenceType === "once") {
      closeEndDatePicker();
    }

    setFields(getNextRecurrenceFormState(getValues(), nextRecurrenceType));
  }

  function handleOpenCustom(): void {
    setFields(getNextRecurrenceFormState(getValues(), "interval_days"));
  }

  function handleChangeCustomUnit(unit: "days" | "weeks" | "months"): void {
    setFields(
      getNextRecurrenceFormState(getValues(), getCustomRecurrenceType(unit))
    );
  }

  function handleCloseCustom(): void {
    setFields(getNextRecurrenceFormState(getValues(), "daily"));
  }

  function handleEnableEndDate(): void {
    setFields(
      getNextEndDateEnabledFormState(getValues(), {
        isEditMode,
        todayLocalDate,
      })
    );
  }

  function handleDisableEndDate(): void {
    closeEndDatePicker();
    setFields(getNextEndDateDisabledFormState(getValues()));
  }

  function handleToggleWeekday(weekdayValue: number): void {
    setField("weekdayMask", toggleWeekdayMask(weekdayMask, weekdayValue));
  }

  function handleChangeStartDate(nextValue: string): void {
    const currentValues = getValues();
    const nextState = getNextStartDateSelectionFormState(
      currentValues,
      nextValue,
      {
        isEditMode,
        minimumStartDateLocal,
      }
    );

    if (nextState === currentValues) {
      return;
    }

    setFields(nextState);
  }

  function handleChangeEndDate(nextValue: string): void {
    const nextState = getNextEndDateSelectionFormState(getValues(), nextValue, {
      isEditMode,
      todayLocalDate,
    });

    setField("endDateLocal", nextState.endDateLocal);
  }

  function syncIosPickerValue(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ): boolean {
    if (Platform.OS !== "ios") {
      return false;
    }

    if (event.type === "set" && selectedDate) {
      setIosPickerValue(selectedDate);
    }

    return true;
  }

  function applyPickerValue(picker: ActivePicker, selectedDate: Date): void {
    if (picker.mode === "time") {
      setField("reminderTimeLocal", formatDateToLocalTime(selectedDate));
    } else if (picker.target === "endDate") {
      handleChangeEndDate(formatDateToLocalDate(selectedDate));
    } else {
      handleChangeStartDate(formatDateToLocalDate(selectedDate));
    }
  }

  function handlePickerChange(
    picker: ActivePicker,
    event: DateTimePickerEvent,
    selectedDate?: Date
  ): void {
    if (syncIosPickerValue(event, selectedDate)) {
      return;
    }

    setActivePicker(null);

    if (event.type === "set" && selectedDate) {
      applyPickerValue(picker, selectedDate);
    }
  }

  function handleStartDatePickerChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ): void {
    handlePickerChange(
      { mode: "date", target: "startDate" },
      event,
      selectedDate
    );
  }

  function handleEndDatePickerChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ): void {
    handlePickerChange(
      { mode: "date", target: "endDate" },
      event,
      selectedDate
    );
  }

  function handleTimePickerChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ): void {
    handlePickerChange({ mode: "time" }, event, selectedDate);
  }

  function getIosPickerValue(picker: ActivePicker): Date {
    return getScheduleFormIosPickerValue({
      datePickerTarget: picker.mode === "date" ? picker.target : null,
      endDateLocal,
      minimumEndDateLocal,
      minimumStartDateLocal,
      mode: picker.mode,
      reminderTimeLocal,
      startDateLocal,
    });
  }

  function openPicker(picker: ActivePicker): void {
    if (Platform.OS === "ios") {
      setIosPickerValue(getIosPickerValue(picker));
    }

    setActivePicker(picker);
  }

  function openDatePicker(): void {
    if (isEditMode) {
      return;
    }

    openPicker({ mode: "date", target: "startDate" });
  }

  function openEndDatePicker(): void {
    if (endDateLocal == null) {
      return;
    }

    openPicker({ mode: "date", target: "endDate" });
  }

  function openTimePicker(): void {
    openPicker({ mode: "time" });
  }

  function closeIosPicker(): void {
    setActivePicker(null);
  }

  function confirmIosPicker(): void {
    if (activePicker) {
      applyPickerValue(activePicker, iosPickerValue);
    }

    closeIosPicker();
  }

  function handleSelectAnchorType(nextAnchorType: AnchorType): void {
    if (nextAnchorType === "completion_based" && !completionBasedEnabled) {
      return;
    }

    setField("anchorType", nextAnchorType);
  }

  function handleChangeDescription(value: string): void {
    setField("description", value);
  }

  function handleChangeIntervalValue(value: string): void {
    setField("intervalValue", getSanitizedIntervalInput(value));
  }

  function handleChangeTitle(value: string): void {
    setField("title", value);
  }

  function handleSelectColorKey(nextColorKey: RecurringItemColorKey): void {
    setField("colorKey", nextColorKey);
  }

  function handleSubmitPress(): void {
    void handleSubmit(handleValidSubmit, () => {
      setRequestState((current) => ({
        ...current,
        screenError: t("scheduleForm.error.checkInput"),
      }));
    })();
  }

  function handleDeletePress(): void {
    if (!isEditMode || !itemId || !user) {
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
          onPress: () => {
            void handleDeleteConfirm(itemId, user.id);
          },
        },
      ]
    );
  }

  function handleToggleNotifications(value: boolean): void {
    setField("notificationsEnabled", value);
  }

  async function handleValidSubmit(
    values: RecurringItemFormValues
  ): Promise<void> {
    if (!profile || !user) {
      Alert.alert(
        t("scheduleForm.saveUnavailable.title"),
        t("scheduleForm.saveUnavailable.message")
      );
      return;
    }

    const draft = toDraft(values, timezone);

    setRequestState((current) => ({
      ...current,
      isSaving: true,
      screenError: null,
    }));

    try {
      if (isEditMode && itemId) {
        await updateSchedule({
          itemId,
          language,
          patch: {
            anchorType: draft.anchorType,
            colorKey: draft.colorKey,
            description: draft.description,
            endDateLocal: draft.endDateLocal,
            intervalValue: draft.intervalValue,
            isArchived: draft.isArchived,
            notificationsEnabled: draft.notificationsEnabled,
            recurrenceType: draft.recurrenceType,
            reminderTimeLocal: draft.reminderTimeLocal,
            title: draft.title,
            weekdayMask: draft.weekdayMask,
          },
          timezone,
          userId: user.id,
        });
      } else {
        await createSchedule({
          draft,
          language,
          userId: user.id,
        });
      }

      router.replace(getSafeReturnPath(returnTo));
    } catch (error) {
      setRequestState((current) => ({
        ...current,
        screenError: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      setRequestState((current) => ({
        ...current,
        isSaving: false,
      }));
    }
  }

  async function handleDeleteConfirm(
    currentItemId: string,
    userId: string
  ): Promise<void> {
    setRequestState((current) => ({
      ...current,
      isDeleting: true,
      screenError: null,
    }));

    try {
      await archiveSchedule({
        itemId: currentItemId,
        language,
        timezone,
        userId,
      });

      router.replace("/");
    } catch (error) {
      setRequestState((current) => ({
        ...current,
        screenError: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      setRequestState((current) => ({
        ...current,
        isDeleting: false,
      }));
    }
  }

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !profile || !user || !itemId) {
      setRequestState((current) => ({
        ...current,
        isBootstrapping: false,
        screenError: t("scheduleForm.error.editLoadFailed"),
      }));
      return;
    }

    const currentItemId = itemId;
    const profileTimezone = profile.timezone;
    const userId = user.id;

    async function loadItem(): Promise<void> {
      setRequestState((current) => ({
        ...current,
        isBootstrapping: true,
        screenError: null,
      }));

      try {
        const item = await getRecurringItemById({
          id: currentItemId,
          timezone: profileTimezone,
          userId,
        });

        setMinimumStartDateLocal(
          getMinimumStartDateLocal({
            initialStartDateLocal: item.startDateLocal,
            isEditMode: true,
            todayLocalDate,
          })
        );
        reset(toFormState(item));
      } catch (error) {
        setRequestState((current) => ({
          ...current,
          screenError: error instanceof Error ? error.message : String(error),
        }));
      } finally {
        setRequestState((current) => ({
          ...current,
          isBootstrapping: false,
        }));
      }
    }

    void loadItem();
  }, [
    isAuthenticated,
    isEditMode,
    isLoading,
    itemId,
    profile,
    reset,
    t,
    todayLocalDate,
    user,
  ]);

  const fieldErrors = {
    anchor: getErrorMessage("anchorType"),
    endDate: getErrorMessage("endDateLocal"),
    interval: getErrorMessage("intervalValue"),
    reminderTime: getErrorMessage("reminderTimeLocal"),
    startDate: getErrorMessage("startDateLocal"),
    title: getErrorMessage("title"),
    weekday: getErrorMessage("weekdayMask"),
  };

  const displayValues = {
    anchorType,
    colorKey,
    endDateLocal,
    intervalValue,
    notificationsEnabled,
    recurrenceType,
    reminderTimeLocal,
    startDateLocal,
    weekdayMask,
  };

  const minimumEndDateLocal = getMinimumEndDateLocal({
    isEditMode,
    startDateLocal,
    todayLocalDate,
  });
  const pickerDates = getScheduleFormPickerDates({
    endDateLocal,
    minimumEndDateLocal,
    minimumStartDateLocal,
    reminderTimeLocal,
    startDateLocal,
  });
  const isIos = Platform.OS === "ios";
  const iosPickerMode = isIos ? (activePicker?.mode ?? null) : null;
  const iosDatePickerTarget =
    isIos && activePicker?.mode === "date" ? activePicker.target : null;
  const isEndDatePickerVisible =
    !isIos &&
    activePicker?.mode === "date" &&
    activePicker.target === "endDate";
  const isStartDatePickerVisible =
    !isIos &&
    activePicker?.mode === "date" &&
    activePicker.target === "startDate";
  const isTimePickerVisible = !isIos && activePicker?.mode === "time";
  const iosPickerMinimumDate =
    iosDatePickerTarget === "endDate"
      ? pickerDates.minimumEndDate
      : pickerDates.minimumStartDate;

  const pickerDisplayState = {
    iosDateTarget: iosDatePickerTarget,
    iosMinimumDate: iosPickerMinimumDate,
    iosMode: iosPickerMode,
    iosValue: iosPickerValue,
    isEndDateVisible: isEndDatePickerVisible,
    isStartDateVisible: isStartDatePickerVisible,
    isTimeVisible: isTimePickerVisible,
    minimumEndDate: pickerDates.minimumEndDate,
    minimumStartDate: pickerDates.minimumStartDate,
    selectedEndDate: pickerDates.selectedEndDate,
    selectedReminderTime: pickerDates.selectedReminderTime,
    selectedStartDate: pickerDates.selectedStartDate,
  };

  const viewState = {
    isBootstrapping,
    isDeleting,
    isEditMode,
    isSaving,
    isStartDateEditable: !isEditMode,
    minimumEndDateLocal,
    minimumStartDateLocal,
    screenError,
    submitCount,
  };

  const contentActions = {
    field: {
      onChangeDescription: handleChangeDescription,
      onSelectColorKey: handleSelectColorKey,
      onChangeTitle: handleChangeTitle,
      onToggleNotifications: handleToggleNotifications,
    },
    picker: {
      onCloseIosPicker: closeIosPicker,
      onConfirmIosPicker: confirmIosPicker,
      onEndDatePickerChange: handleEndDatePickerChange,
      onOpenDatePicker: openDatePicker,
      onOpenEndDatePicker: openEndDatePicker,
      onOpenTimePicker: openTimePicker,
      onStartDatePickerChange: handleStartDatePickerChange,
      onTimePickerChange: handleTimePickerChange,
    },
    recurrence: {
      onChangeIntervalValue: handleChangeIntervalValue,
      onCloseCustom: handleCloseCustom,
      onDisableEndDate: handleDisableEndDate,
      onEnableEndDate: handleEnableEndDate,
      onOpenCustom: handleOpenCustom,
      onSelectAnchorType: handleSelectAnchorType,
      onSelectRecurrence: handleSelectRecurrence,
      onToggleWeekday: handleToggleWeekday,
      onUnitChange: handleChangeCustomUnit,
    },
    screen: {
      onBack: handleBack,
      onDelete: handleDeletePress,
      onSubmit: handleSubmitPress,
    },
  };

  return {
    actions: contentActions,
    control,
    errors: fieldErrors,
    picker: pickerDisplayState,
    values: displayValues,
    view: viewState,
  };
}

function getSafeReturnPath(
  returnTo?: string
): "/" | "/calendar" | "/home" | "/schedule" {
  if (
    returnTo === "/calendar" ||
    returnTo === "/home" ||
    returnTo === "/schedule"
  ) {
    return returnTo;
  }

  return "/";
}
