import { createElement, type ReactElement } from "react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Modal, Platform } from "react-native";

import { useAppLanguage } from "~/i18n/provider";
import {
  createFormValues,
  type ScheduleFormValues,
} from "~/screens/schedule-form/form-values";
import { useTheme } from "~/theme/provider";

import { DateFields } from "./field";

declare const require: (moduleName: string) => unknown;

jest.mock("react-i18next", () => ({ useTranslation: jest.fn() }));
jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: "DateTimePicker",
}));
jest.mock("lucide-react-native", () => ({
  CalendarDays: "CalendarDays",
  Clock3: "Clock3",
}));
jest.mock("~/i18n/provider", () => ({ useAppLanguage: jest.fn() }));
jest.mock("~/theme/provider", () => ({ useTheme: jest.fn() }));
jest.mock("~/ui/app-text", () => ({ AppText: "AppText" }));

type TestInstance = {
  findAllByProps: (props: Record<string, unknown>) => TestInstance[];
  findAllByType: (type: unknown) => TestInstance[];
  findByProps: (props: Record<string, unknown>) => TestInstance;
  findByType: (type: unknown) => TestInstance;
  props: {
    onChange: (event: { type: string }, date?: Date) => void;
    onPress?: () => void;
    onValueChange?: (value: boolean) => void;
    visible: boolean;
  };
};

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => { root: TestInstance };
};

beforeEach(() => {
  setPlatform("ios");
  jest
    .mocked(useTranslation)
    .mockReturnValue({ t: (key: string) => key } as never);
  jest.mocked(useAppLanguage).mockReturnValue({ language: "ko" } as never);
  jest.mocked(useTheme).mockReturnValue({
    colors: {
      background: "#FFF",
      border: "#DDD",
      controlTrack: "#CCC",
      error: "#F00",
      primary: "#111",
      primaryForeground: "#FFF",
      scrim: "#0008",
      text: "#111",
      textMuted: "#777",
      textSoft: "#555",
    },
    resolvedTheme: "light",
  } as never);
});

afterAll(() => setPlatform("ios"));

it("iOS 날짜 선택은 확인할 때만 draft를 폼에 반영한다", async () => {
  let form!: UseFormReturn<ScheduleFormValues>;
  let view!: ReturnType<typeof TestRenderer.create>;

  await TestRenderer.act(() => {
    view = TestRenderer.create(
      createElement(DateFieldsHarness, {
        onForm: (currentForm) => {
          form = currentForm;
        },
      })
    );
  });

  const startDateButton = () =>
    pressableByLabel(view, "scheduleForm.picker.startDateLabel");
  const picker = () => view.root.findByType("DateTimePicker");

  await TestRenderer.act(() => startDateButton().props.onPress?.());
  await TestRenderer.act(() =>
    picker().props.onChange({ type: "set" }, new Date(2026, 7, 5, 12))
  );

  expect(form.getValues("startDateLocal")).toBe("2026-08-04");

  await TestRenderer.act(() =>
    pressableByLabel(view, "scheduleForm.actions.cancel").props.onPress?.()
  );

  expect(form.getValues("startDateLocal")).toBe("2026-08-04");
  expect(view.root.findAllByType(Modal)).toHaveLength(0);

  await TestRenderer.act(() => startDateButton().props.onPress?.());
  await TestRenderer.act(() =>
    picker().props.onChange({ type: "set" }, new Date(2026, 7, 6, 12))
  );
  await TestRenderer.act(() =>
    pressableByLabel(view, "scheduleForm.actions.confirm").props.onPress?.()
  );

  expect(form.getValues("startDateLocal")).toBe("2026-08-06");
  expect(view.root.findAllByType(Modal)).toHaveLength(0);
});

it("Android 선택기는 취소를 버리고 정상 선택을 즉시 반영한다", async () => {
  setPlatform("android");
  let form!: UseFormReturn<ScheduleFormValues>;
  let view!: ReturnType<typeof TestRenderer.create>;

  await TestRenderer.act(() => {
    view = TestRenderer.create(
      createElement(DateFieldsHarness, {
        onForm: (currentForm) => {
          form = currentForm;
        },
      })
    );
  });

  const timeButton = () =>
    pressableByLabel(view, "scheduleForm.picker.reminderTimeLabel");

  await TestRenderer.act(() => timeButton().props.onPress?.());
  await TestRenderer.act(() =>
    view.root
      .findByType("DateTimePicker")
      .props.onChange({ type: "dismissed" }, new Date(2026, 7, 4, 10, 30))
  );

  expect(form.getValues("reminderTimeLocal")).toBe("09:00");

  await TestRenderer.act(() => timeButton().props.onPress?.());
  await TestRenderer.act(() =>
    view.root
      .findByType("DateTimePicker")
      .props.onChange({ type: "set" }, new Date(2026, 7, 4, 10, 30))
  );

  expect(form.getValues("reminderTimeLocal")).toBe("10:30");
});

it("종료일 해제는 열린 picker와 값을 함께 제거한다", async () => {
  let form!: UseFormReturn<ScheduleFormValues>;
  let view!: ReturnType<typeof TestRenderer.create>;

  await TestRenderer.act(() => {
    view = TestRenderer.create(
      createElement(DateFieldsHarness, {
        onForm: (currentForm) => {
          form = currentForm;
        },
      })
    );
  });

  const endDateToggle = () =>
    view.root.findByProps({
      accessibilityLabel: "scheduleForm.endDate.toggleLabel",
    });

  await TestRenderer.act(() => endDateToggle().props.onValueChange?.(true));
  await TestRenderer.act(() =>
    pressableByLabel(view, "scheduleForm.picker.endDateLabel").props.onPress?.()
  );

  expect(form.getValues("endDateLocal")).toBe("2026-08-04");
  expect(view.root.findAllByType(Modal)).toHaveLength(1);

  await TestRenderer.act(() => endDateToggle().props.onValueChange?.(false));

  expect(form.getValues("endDateLocal")).toBeNull();
  expect(view.root.findAllByType(Modal)).toHaveLength(0);
});

function DateFieldsHarness({
  onForm,
}: {
  onForm: (form: UseFormReturn<ScheduleFormValues>) => void;
}): React.JSX.Element {
  const form = useForm<ScheduleFormValues>({
    defaultValues: createFormValues(new Date(2026, 7, 4, 9)),
  });

  onForm(form);

  return (
    <FormProvider {...form}>
      <DateFields isEdit={false} today="2026-08-04" />
    </FormProvider>
  );
}

function setPlatform(os: "android" | "ios"): void {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

function pressableByLabel(
  view: ReturnType<typeof TestRenderer.create>,
  accessibilityLabel: string
): TestInstance {
  const pressable = view.root
    .findAllByProps({ accessibilityLabel })
    .find((instance) => typeof instance.props.onPress === "function");

  if (!pressable) {
    throw new Error(`${accessibilityLabel} 버튼을 찾을 수 없습니다.`);
  }

  return pressable;
}
