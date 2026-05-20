import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert, Platform } from "react-native";
import { router } from "expo-router";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useQueryClient } from "@tanstack/react-query";

import { useSession } from "~/application/session";
import {
  type AnchorType,
  type RecurrenceType,
  type RecurringItemColorKey,
} from "~/entities/schedule";
import { supportsCompletionBased } from "~/entities/schedule";
import { getRecurringItemById } from "~/entities/schedule/api";
import { archiveSchedule } from "~/features/archive-schedule";
import { createSchedule } from "~/features/create-schedule";
import { useNotifications } from "~/features/notifications";
import { createRecurringMutationPostprocessAdapter } from "~/features/recurring/hooks/recurring-mutation-postprocess";
import { updateSchedule } from "~/features/update-schedule";
import { Sentry } from "~/shared/config/sentry";

import { type ScheduleFormScreenModel } from "./schedule-form-contracts";
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
  getNextRecurrenceFormState,
  getNextStartDateFormState,
  getTodayLocalDate,
  normalizeStartDateSelection,
  parseLocalDateToDate,
  parseLocalTimeToDate,
  type PickerMode,
  type RecurringItemFormValues,
  toDraft,
  toFormState,
  toggleWeekdayMask,
} from "./schedule-form-state";

type UseScheduleFormScreenControllerParams = {
  itemId?: string;
  returnTo?: string;
};

export function useScheduleFormScreenController({
  itemId,
  returnTo,
}: UseScheduleFormScreenControllerParams): ScheduleFormScreenModel {
  const isEditMode = Boolean(itemId);
  const todayLocalDate = getTodayLocalDate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, profile, user } = useSession();
  const { syncAfterMutation } = useNotifications();
  const mutationPostprocess = createRecurringMutationPostprocessAdapter({
    captureException: Sentry.captureException,
    queryClient,
    syncAfterMutation,
  });
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
  const [pickerState, setPickerState] = useState({
    iosDatePickerTarget: null as DatePickerTarget | null,
    iosPickerMode: null as PickerMode | null,
    iosPickerValue: new Date(),
    isEndDatePickerVisible: false,
    isStartDatePickerVisible: false,
    isTimePickerVisible: false,
  });
  const { isBootstrapping, isDeleting, isSaving, screenError } = requestState;
  const {
    iosDatePickerTarget,
    iosPickerMode,
    iosPickerValue,
    isEndDatePickerVisible,
    isStartDatePickerVisible,
    isTimePickerVisible,
  } = pickerState;

  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const defaultValues = createDefaultFormState();
  const formSchema = useMemo(
    () =>
      createRecurringItemFormSchema({
        isEditMode,
        todayLocalDate,
      }),
    [isEditMode, todayLocalDate]
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
    setPickerState((current) => ({
      ...current,
      iosDatePickerTarget:
        current.iosDatePickerTarget === "endDate"
          ? null
          : current.iosDatePickerTarget,
      iosPickerMode:
        current.iosPickerMode === "date" &&
        current.iosDatePickerTarget === "endDate"
          ? null
          : current.iosPickerMode,
      isEndDatePickerVisible: false,
    }));
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

  function getCurrentMinimumEndDateLocal(): string {
    return getMinimumEndDateLocal({
      isEditMode,
      startDateLocal,
      todayLocalDate,
    });
  }

  function handleToggleWeekday(weekdayValue: number): void {
    setField("weekdayMask", toggleWeekdayMask(weekdayMask, weekdayValue));
  }

  function handleChangeStartDate(nextValue: string): void {
    if (isEditMode) {
      return;
    }

    const normalizedValue = normalizeStartDateSelection(
      nextValue,
      minimumStartDateLocal
    );

    setFields(getNextStartDateFormState(getValues(), normalizedValue));
  }

  function handleChangeEndDate(nextValue: string): void {
    const minimumEndDateLocal = getCurrentMinimumEndDateLocal();
    const normalizedValue =
      nextValue < minimumEndDateLocal ? minimumEndDateLocal : nextValue;

    setField("endDateLocal", normalizedValue);
  }

  function syncIosPickerValue(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ): boolean {
    if (Platform.OS !== "ios") {
      return false;
    }

    if (event.type === "set" && selectedDate) {
      setPickerState((current) => ({
        ...current,
        iosPickerValue: selectedDate,
      }));
    }

    return true;
  }

  function closeInlinePicker(
    mode: PickerMode,
    datePickerTarget: DatePickerTarget | null = null
  ): void {
    setPickerState((current) => ({
      ...current,
      isEndDatePickerVisible:
        mode === "date" && datePickerTarget === "endDate"
          ? false
          : current.isEndDatePickerVisible,
      isStartDatePickerVisible:
        mode === "date" && datePickerTarget !== "endDate"
          ? false
          : current.isStartDatePickerVisible,
      isTimePickerVisible:
        mode === "time" ? false : current.isTimePickerVisible,
    }));
  }

  function applyPickerValue(
    mode: PickerMode,
    selectedDate: Date,
    datePickerTarget: DatePickerTarget | null = null
  ): void {
    if (mode === "time") {
      setField("reminderTimeLocal", formatDateToLocalTime(selectedDate));
    } else if (datePickerTarget === "endDate") {
      handleChangeEndDate(formatDateToLocalDate(selectedDate));
    } else {
      handleChangeStartDate(formatDateToLocalDate(selectedDate));
    }
  }

  function handleStartDatePickerChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ): void {
    if (syncIosPickerValue(event, selectedDate)) {
      return;
    }

    closeInlinePicker("date", "startDate");

    if (event.type === "set" && selectedDate) {
      applyPickerValue("date", selectedDate, "startDate");
    }
  }

  function handleEndDatePickerChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ): void {
    if (syncIosPickerValue(event, selectedDate)) {
      return;
    }

    closeInlinePicker("date", "endDate");

    if (event.type === "set" && selectedDate) {
      applyPickerValue("date", selectedDate, "endDate");
    }
  }

  function handleTimePickerChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ): void {
    if (syncIosPickerValue(event, selectedDate)) {
      return;
    }

    closeInlinePicker("time");

    if (event.type === "set" && selectedDate) {
      applyPickerValue("time", selectedDate);
    }
  }

  function getIosPickerValue(
    mode: PickerMode,
    datePickerTarget: DatePickerTarget | null
  ): Date {
    if (mode === "time") {
      return parseLocalTimeToDate(reminderTimeLocal);
    }

    if (datePickerTarget === "endDate") {
      const minimumEndDateLocal = getCurrentMinimumEndDateLocal();
      const selectedEndDateLocal = endDateLocal ?? minimumEndDateLocal;

      return parseLocalDateToDate(
        selectedEndDateLocal < minimumEndDateLocal
          ? minimumEndDateLocal
          : selectedEndDateLocal
      );
    }

    return parseLocalDateToDate(
      startDateLocal < minimumStartDateLocal
        ? minimumStartDateLocal
        : startDateLocal
    );
  }

  function openPicker(
    mode: PickerMode,
    datePickerTarget: DatePickerTarget | null = null
  ): void {
    if (Platform.OS === "ios") {
      setPickerState((current) => ({
        ...current,
        iosDatePickerTarget: mode === "date" ? datePickerTarget : null,
        iosPickerMode: mode,
        iosPickerValue: getIosPickerValue(mode, datePickerTarget),
      }));
      return;
    }

    setPickerState((current) => ({
      ...current,
      isEndDatePickerVisible: mode === "date" && datePickerTarget === "endDate",
      isStartDatePickerVisible:
        mode === "date" && datePickerTarget !== "endDate",
      isTimePickerVisible: mode === "time",
    }));
  }

  function openDatePicker(): void {
    if (isEditMode) {
      return;
    }

    openPicker("date", "startDate");
  }

  function openEndDatePicker(): void {
    if (endDateLocal == null) {
      return;
    }

    openPicker("date", "endDate");
  }

  function openTimePicker(): void {
    openPicker("time");
  }

  function closeIosPicker(): void {
    setPickerState((current) => ({
      ...current,
      iosDatePickerTarget: null,
      iosPickerMode: null,
    }));
  }

  function confirmIosPicker(): void {
    if (iosPickerMode) {
      applyPickerValue(iosPickerMode, iosPickerValue, iosDatePickerTarget);
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
    setField("intervalValue", value.replace(/[^0-9]/g, ""));
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
        screenError: "입력한 내용을 확인해 주세요.",
      }));
    })();
  }

  function handleDeletePress(): void {
    if (!isEditMode || !itemId || !user) {
      return;
    }

    Alert.alert("일정 삭제", "이 일정을 삭제할까요?", [
      {
        style: "cancel",
        text: "취소",
      },
      {
        style: "destructive",
        text: "삭제",
        onPress: () => {
          void handleDeleteConfirm(itemId, user.id);
        },
      },
    ]);
  }

  function handleToggleNotifications(value: boolean): void {
    setField("notificationsEnabled", value);
  }

  async function handleValidSubmit(
    values: RecurringItemFormValues
  ): Promise<void> {
    if (!profile || !user) {
      Alert.alert("저장 불가", "세션 정보를 먼저 확인해주세요.");
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
          completeMutation: mutationPostprocess.completeItemMutation,
          itemId,
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
          completeMutation: mutationPostprocess.completeItemMutation,
          draft,
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
        completeMutation: mutationPostprocess.completeItemMutation,
        itemId: currentItemId,
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
        screenError: "수정할 항목을 불러올 수 없습니다.",
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

  const pickerDisplayState = {
    iosDateTarget: iosDatePickerTarget,
    iosMode: iosPickerMode,
    iosValue: iosPickerValue,
    isEndDateVisible: isEndDatePickerVisible,
    isStartDateVisible: isStartDatePickerVisible,
    isTimeVisible: isTimePickerVisible,
  };

  const viewState = {
    isBootstrapping,
    isDeleting,
    isEditMode,
    isSaving,
    isStartDateEditable: !isEditMode,
    minimumEndDateLocal: getMinimumEndDateLocal({
      isEditMode,
      startDateLocal,
      todayLocalDate,
    }),
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
