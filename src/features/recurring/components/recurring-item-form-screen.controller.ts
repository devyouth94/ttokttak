import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert, Platform } from "react-native";
import { router } from "expo-router";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useQueryClient } from "@tanstack/react-query";

import { useNotificationBootstrap } from "~/features/notifications/notification-bootstrap";
import {
  type AnchorType,
  type RecurrenceType,
} from "~/features/recurring/domain/types";
import { recurringQueryKeys } from "~/features/recurring/hooks/recurring-query-keys";
import {
  archiveRecurringItem,
  createRecurringItem,
  getRecurringItemById,
  updateRecurringItem,
} from "~/features/recurring/repositories/recurring-items-repository";
import { useSession } from "~/features/session/session-provider";

import { type RecurringItemFormScreenModel } from "./recurring-item-form-screen.contracts";
import {
  createDefaultFormState,
  formatDateToLocalDate,
  formatDateToLocalTime,
  getCompletionBasedEnabled,
  getCustomRecurrenceType,
  getMinimumStartDateLocal,
  getNextRecurrenceFormState,
  getNextStartDateFormState,
  getTodayLocalDate,
  normalizeStartDateSelection,
  parseLocalDateToDate,
  parseLocalTimeToDate,
  type PickerMode,
  recurringItemFormSchema,
  type RecurringItemFormValues,
  toDraft,
  toFormState,
  toggleWeekdayMask,
} from "./recurring-item-form-screen.helpers";

type UseRecurringItemFormScreenControllerParams = {
  itemId?: string;
  returnTo?: string;
};

export function useRecurringItemFormScreenController({
  itemId,
  returnTo,
}: UseRecurringItemFormScreenControllerParams): RecurringItemFormScreenModel {
  const isEditMode = Boolean(itemId);
  const todayLocalDate = getTodayLocalDate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, profile, user } = useSession();
  const { syncAfterMutation } = useNotificationBootstrap();
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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [pickerState, setPickerState] = useState({
    iosPickerMode: null as PickerMode | null,
    iosPickerValue: new Date(),
    isStartDatePickerVisible: false,
    isTimePickerVisible: false,
  });
  const { isBootstrapping, isDeleting, isSaving, screenError } = requestState;
  const {
    iosPickerMode,
    iosPickerValue,
    isStartDatePickerVisible,
    isTimePickerVisible,
  } = pickerState;

  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const defaultValues = createDefaultFormState();

  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    reset,
    setValue,
  } = useForm<RecurringItemFormValues>({
    defaultValues,
    resolver: standardSchemaResolver(recurringItemFormSchema),
  });

  const formValues = useWatch({
    control,
    defaultValue: defaultValues,
  });
  const {
    anchorType = defaultValues.anchorType,
    category = defaultValues.category,
    intervalValue = defaultValues.intervalValue,
    notificationsEnabled = defaultValues.notificationsEnabled,
    recurrenceType = defaultValues.recurrenceType,
    reminderTimeLocal = defaultValues.reminderTimeLocal,
    startDateLocal = defaultValues.startDateLocal,
    weekdayMask = defaultValues.weekdayMask,
  } = formValues;
  const completionBasedEnabled = getCompletionBasedEnabled(recurrenceType);

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
      shouldValidate: true,
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

  function handleBack(): void {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  }

  function handleSelectRecurrence(nextRecurrenceType: RecurrenceType): void {
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
    setFields(getNextRecurrenceFormState(getValues(), "once"));
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

  function closeInlinePicker(mode: PickerMode): void {
    setPickerState((current) => ({
      ...current,
      isStartDatePickerVisible:
        mode === "date" ? false : current.isStartDatePickerVisible,
      isTimePickerVisible:
        mode === "time" ? false : current.isTimePickerVisible,
    }));
  }

  function applyPickerValue(mode: PickerMode, selectedDate: Date): void {
    if (mode === "time") {
      setField("reminderTimeLocal", formatDateToLocalTime(selectedDate));
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

    closeInlinePicker("date");

    if (event.type === "set" && selectedDate) {
      applyPickerValue("date", selectedDate);
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

  function openPicker(mode: PickerMode): void {
    if (Platform.OS === "ios") {
      setPickerState((current) => ({
        ...current,
        iosPickerMode: mode,
        iosPickerValue:
          mode === "date"
            ? parseLocalDateToDate(
                startDateLocal < minimumStartDateLocal
                  ? minimumStartDateLocal
                  : startDateLocal
              )
            : parseLocalTimeToDate(reminderTimeLocal),
      }));
      return;
    }

    setPickerState((current) => ({
      ...current,
      isStartDatePickerVisible:
        mode === "date" ? true : current.isStartDatePickerVisible,
      isTimePickerVisible: mode === "time" ? true : current.isTimePickerVisible,
    }));
  }

  function openDatePicker(): void {
    if (isEditMode) {
      return;
    }

    openPicker("date");
  }

  function openTimePicker(): void {
    openPicker("time");
  }

  function closeIosPicker(): void {
    setPickerState((current) => ({
      ...current,
      iosPickerMode: null,
    }));
  }

  function confirmIosPicker(): void {
    if (iosPickerMode) {
      applyPickerValue(iosPickerMode, iosPickerValue);
    }

    closeIosPicker();
  }

  function handleSelectAnchorType(nextAnchorType: AnchorType): void {
    if (nextAnchorType === "completion_based" && !completionBasedEnabled) {
      return;
    }

    setField("anchorType", nextAnchorType);
  }

  function handleCategoryChange(value: string): void {
    setField("category", value);
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

  function handleSubmitPress(): void {
    void handleSubmit(handleValidSubmit, () => {
      setRequestState((current) => ({
        ...current,
        screenError: "입력값을 확인해주세요.",
      }));
    })();
  }

  function handleDeletePress(): void {
    if (!isEditMode || !itemId || !user) {
      return;
    }

    Alert.alert("리마인더 삭제", "이 리마인더를 삭제할까요?", [
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

  function handleToggleAdvanced(): void {
    setIsAdvancedOpen((current) => !current);
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
        const syncEffectiveFromUtc = new Date().toISOString();

        await updateRecurringItem({
          id: itemId,
          patch: {
            anchorType: draft.anchorType,
            category: draft.category,
            description: draft.description,
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

        await syncAfterMutation({
          reason: "item-updated",
          scope: {
            effectiveFromUtc: syncEffectiveFromUtc,
            itemId,
            type: "item",
          },
        });
      } else {
        const createdItem = await createRecurringItem({
          ...draft,
          userId: user.id,
        });

        await syncAfterMutation({
          reason: "item-created",
          scope: {
            effectiveFromUtc: new Date().toISOString(),
            itemId: createdItem.id,
            type: "item",
          },
        });
      }

      await queryClient.invalidateQueries({
        queryKey: recurringQueryKeys.user(user.id),
      });
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
      await archiveRecurringItem({
        id: currentItemId,
        userId,
      });

      await syncAfterMutation({
        reason: "item-archived",
        scope: {
          effectiveFromUtc: new Date().toISOString(),
          itemId: currentItemId,
          type: "item",
        },
      });

      await queryClient.invalidateQueries({
        queryKey: recurringQueryKeys.user(userId),
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

  const fieldErrors = {
    anchor: getErrorMessage("anchorType"),
    interval: getErrorMessage("intervalValue"),
    reminderTime: getErrorMessage("reminderTimeLocal"),
    startDate: getErrorMessage("startDateLocal"),
    title: getErrorMessage("title"),
    weekday: getErrorMessage("weekdayMask"),
  };

  const displayValues = {
    anchorType,
    category,
    intervalValue,
    notificationsEnabled,
    recurrenceType,
    reminderTimeLocal,
    startDateLocal,
    weekdayMask,
  };

  const pickerDisplayState = {
    iosMode: iosPickerMode,
    iosValue: iosPickerValue,
    isStartDateVisible: isStartDatePickerVisible,
    isTimeVisible: isTimePickerVisible,
  };

  const viewState = {
    isAdvancedOpen,
    isBootstrapping,
    isDeleting,
    isEditMode,
    isSaving,
    isStartDateEditable: !isEditMode,
    minimumStartDateLocal,
    screenError,
    showsEditEffectNotice: isEditMode,
  };

  const contentActions = {
    field: {
      onCategoryChange: handleCategoryChange,
      onChangeDescription: handleChangeDescription,
      onChangeTitle: handleChangeTitle,
      onToggleNotifications: handleToggleNotifications,
    },
    picker: {
      onCloseIosPicker: closeIosPicker,
      onConfirmIosPicker: confirmIosPicker,
      onOpenDatePicker: openDatePicker,
      onOpenTimePicker: openTimePicker,
      onStartDatePickerChange: handleStartDatePickerChange,
      onTimePickerChange: handleTimePickerChange,
    },
    recurrence: {
      onChangeIntervalValue: handleChangeIntervalValue,
      onCloseCustom: handleCloseCustom,
      onOpenCustom: handleOpenCustom,
      onSelectAnchorType: handleSelectAnchorType,
      onSelectRecurrence: handleSelectRecurrence,
      onToggleAdvanced: handleToggleAdvanced,
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
