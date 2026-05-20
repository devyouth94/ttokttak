import { type Control } from "react-hook-form";
import { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

import {
  type AnchorType,
  type RecurrenceType,
  type RecurringItemColorKey,
} from "~/entities/schedule";

import { type PickerChangeHandler } from "./recurring-item-form-screen.helpers";
import {
  type CustomRecurrenceUnit,
  type DatePickerTarget,
  type PickerMode,
  type RecurringItemFormValues,
} from "./recurring-item-form-state";

type RecurringItemFormErrors = {
  anchor?: string;
  endDate?: string;
  interval?: string;
  reminderTime?: string;
  startDate?: string;
  title?: string;
  weekday?: string;
};

type RecurringItemFormDisplayValues = {
  anchorType: AnchorType;
  colorKey: RecurringItemColorKey;
  endDateLocal: string | null;
  intervalValue: string;
  notificationsEnabled: boolean;
  recurrenceType: RecurrenceType;
  reminderTimeLocal: string;
  startDateLocal: string;
  weekdayMask: number[];
};

type RecurringItemFormPickerState = {
  iosDateTarget: DatePickerTarget | null;
  iosMode: PickerMode | null;
  iosValue: Date;
  isEndDateVisible: boolean;
  isStartDateVisible: boolean;
  isTimeVisible: boolean;
};

type RecurringItemFormViewState = {
  isBootstrapping: boolean;
  isDeleting: boolean;
  isEditMode: boolean;
  isSaving: boolean;
  isStartDateEditable: boolean;
  minimumEndDateLocal: string;
  minimumStartDateLocal: string;
  screenError: string | null;
  submitCount: number;
};

type RecurringItemFormScreenActions = {
  onBack: () => void;
  onDelete: () => void;
  onSubmit: () => void;
};

type RecurringItemFormFieldActions = {
  onChangeDescription: (value: string) => void;
  onSelectColorKey: (colorKey: RecurringItemColorKey) => void;
  onChangeTitle: (value: string) => void;
  onToggleNotifications: (value: boolean) => void;
};

type RecurringItemFormRecurrenceActions = {
  onChangeIntervalValue: (value: string) => void;
  onCloseCustom: () => void;
  onDisableEndDate: () => void;
  onEnableEndDate: () => void;
  onOpenCustom: () => void;
  onSelectAnchorType: (anchorType: AnchorType) => void;
  onSelectRecurrence: (recurrenceType: RecurrenceType) => void;
  onToggleWeekday: (weekdayValue: number) => void;
  onUnitChange: (unit: CustomRecurrenceUnit) => void;
};

type RecurringItemFormPickerActions = {
  onCloseIosPicker: () => void;
  onConfirmIosPicker: () => void;
  onOpenDatePicker: () => void;
  onOpenEndDatePicker: () => void;
  onOpenTimePicker: () => void;
  onEndDatePickerChange: (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => void;
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
    iosPickerChangeHandler: PickerChangeHandler;
  };
