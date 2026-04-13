import { type Control } from "react-hook-form";
import { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

import {
  type AnchorType,
  type RecurrenceType,
} from "~/features/recurring/domain/types";

import {
  type CustomRecurrenceUnit,
  type PickerChangeHandler,
  type PickerMode,
  type RecurringItemFormValues,
} from "./recurring-item-form-screen.helpers";

type RecurringItemFormErrors = {
  anchor?: string;
  interval?: string;
  reminderTime?: string;
  startDate?: string;
  title?: string;
  weekday?: string;
};

type RecurringItemFormDisplayValues = {
  anchorType: AnchorType;
  category: string;
  intervalValue: string;
  notificationsEnabled: boolean;
  recurrenceType: RecurrenceType;
  reminderTimeLocal: string;
  startDateLocal: string;
  weekdayMask: number[];
};

type RecurringItemFormPickerState = {
  iosMode: PickerMode | null;
  iosValue: Date;
  isStartDateVisible: boolean;
  isTimeVisible: boolean;
};

type RecurringItemFormViewState = {
  isAdvancedOpen: boolean;
  isBootstrapping: boolean;
  isDeleting: boolean;
  isEditMode: boolean;
  isSaving: boolean;
  minimumStartDateLocal: string;
  screenError: string | null;
};

type RecurringItemFormScreenActions = {
  onBack: () => void;
  onDelete: () => void;
  onSubmit: () => void;
};

type RecurringItemFormFieldActions = {
  onCategoryChange: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeTitle: (value: string) => void;
  onToggleNotifications: (value: boolean) => void;
};

type RecurringItemFormRecurrenceActions = {
  onChangeIntervalValue: (value: string) => void;
  onCloseCustom: () => void;
  onOpenCustom: () => void;
  onSelectAnchorType: (anchorType: AnchorType) => void;
  onSelectRecurrence: (recurrenceType: RecurrenceType) => void;
  onToggleAdvanced: () => void;
  onToggleWeekday: (weekdayValue: number) => void;
  onUnitChange: (unit: CustomRecurrenceUnit) => void;
};

type RecurringItemFormPickerActions = {
  onCloseIosPicker: () => void;
  onConfirmIosPicker: () => void;
  onOpenDatePicker: () => void;
  onOpenTimePicker: () => void;
  onStartDatePickerChange: (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => void;
  onTimePickerChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
};

type RecurringItemFormActions = {
  field: RecurringItemFormFieldActions;
  picker: RecurringItemFormPickerActions;
  recurrence: RecurringItemFormRecurrenceActions;
  screen: RecurringItemFormScreenActions;
};

export type RecurringItemFormScreenModel = {
  actions: RecurringItemFormActions;
  control: Control<RecurringItemFormValues>;
  errors: RecurringItemFormErrors;
  picker: RecurringItemFormPickerState;
  values: RecurringItemFormDisplayValues;
  view: RecurringItemFormViewState;
};

export type RecurringItemFormScreenContentProps =
  RecurringItemFormScreenModel & {
    completionBasedEnabled: boolean;
    iosPickerChangeHandler: PickerChangeHandler;
  };
