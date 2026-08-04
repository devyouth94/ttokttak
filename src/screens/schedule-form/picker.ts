import { useState } from "react";
import { Platform } from "react-native";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format, parse } from "date-fns";

type ActivePicker =
  | { mode: "date"; target: "endDate" | "startDate" }
  | { mode: "time" };

type Params = {
  endDateLocal: string | null;
  isStartDateEditable: boolean;
  minimumEndDateLocal: string;
  minimumStartDateLocal: string;
  reminderTimeLocal: string;
  startDateLocal: string;
  onChangeEndDate: (date: string) => void;
  onChangeReminderTime: (time: string) => void;
  onChangeStartDate: (date: string) => void;
};

/** 네이티브 날짜 선택기의 플랫폼별 열기, 적용과 표시 상태를 관리한다. */
export function useSchedulePicker({
  endDateLocal,
  isStartDateEditable,
  minimumEndDateLocal,
  minimumStartDateLocal,
  reminderTimeLocal,
  startDateLocal,
  onChangeEndDate,
  onChangeReminderTime,
  onChangeStartDate,
}: Params) {
  const [activePicker, setActivePicker] = useState<ActivePicker | null>(null);
  const [iosValue, setIosValue] = useState(new Date());
  const selectedEndDateLocal =
    endDateLocal && endDateLocal >= minimumEndDateLocal
      ? endDateLocal
      : minimumEndDateLocal;
  const selectedStartDateLocal =
    startDateLocal < minimumStartDateLocal
      ? minimumStartDateLocal
      : startDateLocal;

  const minimumEndDate = parseDate(minimumEndDateLocal);
  const minimumStartDate = parseDate(minimumStartDateLocal);
  const selectedEndDate = parseDate(selectedEndDateLocal);
  const selectedReminderTime = parseTime(reminderTimeLocal);
  const selectedStartDate = parseDate(selectedStartDateLocal);

  function apply(picker: ActivePicker, date: Date): void {
    if (picker.mode === "time") {
      onChangeReminderTime(format(date, "HH:mm"));
    } else if (picker.target === "endDate") {
      onChangeEndDate(format(date, "yyyy-MM-dd"));
    } else {
      onChangeStartDate(format(date, "yyyy-MM-dd"));
    }
  }

  function change(
    picker: ActivePicker,
    event: DateTimePickerEvent,
    date?: Date
  ): void {
    if (Platform.OS === "ios") {
      if (event.type === "set" && date) {
        setIosValue(date);
      }

      return;
    }

    setActivePicker(null);

    if (event.type === "set" && date) {
      apply(picker, date);
    }
  }

  function selectedDate(picker: ActivePicker): Date {
    if (picker.mode === "time") {
      return selectedReminderTime;
    }

    return picker.target === "endDate" ? selectedEndDate : selectedStartDate;
  }

  function open(picker: ActivePicker): void {
    if (Platform.OS === "ios") {
      setIosValue(selectedDate(picker));
    }

    setActivePicker(picker);
  }

  function closeEndDate(): void {
    setActivePicker((current) =>
      current?.mode === "date" && current.target === "endDate" ? null : current
    );
  }

  function closeIos(): void {
    setActivePicker(null);
  }

  function confirmIos(): void {
    if (activePicker) {
      apply(activePicker, iosValue);
    }

    closeIos();
  }

  const isIos = Platform.OS === "ios";
  const iosMode: ActivePicker["mode"] | null = isIos
    ? (activePicker?.mode ?? null)
    : null;
  const iosDateTarget =
    isIos && activePicker?.mode === "date" ? activePicker.target : null;

  return {
    actions: {
      onCloseIosPicker: closeIos,
      onConfirmIosPicker: confirmIos,
      onEndDatePickerChange: (event: DateTimePickerEvent, date?: Date) =>
        change({ mode: "date", target: "endDate" }, event, date),
      onOpenDatePicker: () =>
        isStartDateEditable && open({ mode: "date", target: "startDate" }),
      onOpenEndDatePicker: () =>
        endDateLocal && open({ mode: "date", target: "endDate" }),
      onOpenTimePicker: () => open({ mode: "time" }),
      onStartDatePickerChange: (event: DateTimePickerEvent, date?: Date) =>
        change({ mode: "date", target: "startDate" }, event, date),
      onTimePickerChange: (event: DateTimePickerEvent, date?: Date) =>
        change({ mode: "time" }, event, date),
    },
    closeEndDate,
    state: {
      iosDateTarget,
      iosMinimumDate:
        iosDateTarget === "endDate" ? minimumEndDate : minimumStartDate,
      iosMode,
      iosValue,
      isEndDateVisible:
        !isIos &&
        activePicker?.mode === "date" &&
        activePicker.target === "endDate",
      isStartDateVisible:
        !isIos &&
        activePicker?.mode === "date" &&
        activePicker.target === "startDate",
      isTimeVisible: !isIos && activePicker?.mode === "time",
      minimumEndDate,
      minimumStartDate,
      selectedEndDate,
      selectedReminderTime,
      selectedStartDate,
    },
  } as const;
}

function parseDate(localDate: string): Date {
  return parse(localDate, "yyyy-MM-dd", new Date());
}

function parseTime(localTime: string): Date {
  return parse(localTime, "HH:mm", new Date());
}
