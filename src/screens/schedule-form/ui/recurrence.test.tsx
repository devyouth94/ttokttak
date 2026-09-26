import { createElement, type ReactElement } from "react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useThemeColors } from "~/theme/provider";

import { RecurrenceSection } from "./recurrence";
import { createFormValues, type ScheduleFormValues } from "../form-values";

declare const require: (moduleName: string) => unknown;

jest.mock("react-i18next", () => ({ useTranslation: jest.fn() }));
jest.mock("~/theme/provider", () => ({ useThemeColors: jest.fn() }));
jest.mock("~/ui/app-text", () => ({ AppText: "AppText" }));

type TestInstance = {
  findByProps: (props: Record<string, unknown>) => TestInstance;
  props: { onPress: () => void };
};

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => { root: TestInstance };
};

beforeEach(() => {
  jest
    .mocked(useTranslation)
    .mockReturnValue({ t: (key: string) => key } as never);
  jest.mocked(useThemeColors).mockReturnValue({
    border: "#DDD",
    error: "#F00",
    primary: "#111",
    primaryForeground: "#FFF",
    surface: "#EEE",
    text: "#111",
    textMuted: "#777",
    textSoft: "#555",
  } as never);
});

it("반복 방식 전환 시 연관 필드를 한 번에 정리한다", async () => {
  let form!: UseFormReturn<ScheduleFormValues>;
  let view!: ReturnType<typeof TestRenderer.create>;

  await TestRenderer.act(() => {
    view = TestRenderer.create(
      createElement(RecurrenceHarness, {
        onForm: (currentForm) => {
          form = currentForm;
        },
      })
    );
  });

  await TestRenderer.act(() =>
    view.root
      .findByProps({
        accessibilityLabel: "scheduleForm.recurrence.weekly",
      })
      .props.onPress()
  );

  expect(form.getValues()).toMatchObject({
    anchorType: "fixed",
    endDateLocal: "2026-08-10",
    recurrenceType: "weekly",
    weekdayMask: [2],
  });

  await TestRenderer.act(() =>
    view.root
      .findByProps({
        accessibilityLabel: "scheduleForm.recurrence.weekdayTue",
      })
      .props.onPress()
  );

  expect(form.getValues("weekdayMask")).toEqual([]);

  await TestRenderer.act(() =>
    view.root
      .findByProps({ accessibilityLabel: "scheduleForm.recurrence.once" })
      .props.onPress()
  );

  expect(form.getValues()).toMatchObject({
    anchorType: "fixed",
    endDateLocal: null,
    intervalValue: "",
    recurrenceType: "once",
    weekdayMask: [],
  });
});

function RecurrenceHarness({
  onForm,
}: {
  onForm: (form: UseFormReturn<ScheduleFormValues>) => void;
}): React.JSX.Element {
  const form = useForm<ScheduleFormValues>({
    defaultValues: {
      ...createFormValues(new Date(2026, 7, 4, 9)),
      anchorType: "completion_based",
      endDateLocal: "2026-08-10",
    },
  });

  onForm(form);

  return (
    <FormProvider {...form}>
      <RecurrenceSection />
    </FormProvider>
  );
}
