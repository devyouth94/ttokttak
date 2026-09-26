import { createElement, type ReactElement } from "react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Modal } from "react-native";

import { useAppLanguage } from "~/i18n/provider";

import { ColorField } from "./field";
import { createFormValues, type ScheduleFormValues } from "../../form-values";

declare const require: (moduleName: string) => unknown;

jest.mock("react-i18next", () => ({ useTranslation: jest.fn() }));
jest.mock("lucide-react-native", () => ({ Check: "Check" }));
jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: "Svg",
  Circle: "Circle",
  Defs: "Defs",
  LinearGradient: "LinearGradient",
  RadialGradient: "RadialGradient",
  Rect: "Rect",
  Stop: "Stop",
}));
jest.mock("~/i18n/provider", () => ({ useAppLanguage: jest.fn() }));
jest.mock("~/theme/provider", () => ({
  useThemeColors: () => ({
    border: "#DDD",
    primary: "#222",
  }),
}));
jest.mock("~/ui/app-text", () => ({ AppText: "AppText" }));

type TestInstance = {
  findByProps: (props: Record<string, unknown>) => TestInstance;
  findByType: (type: unknown) => TestInstance;
  props: {
    accessibilityState: { checked: boolean };
    onAccessibilityAction: (event: {
      nativeEvent: { actionName: string };
    }) => void;
    onPress: () => void;
    visible: boolean;
  };
};

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => {
    root: TestInstance;
    update: (element: ReactElement) => void;
  };
};

let form: UseFormReturn<ScheduleFormValues>;

function Harness() {
  form = useForm<ScheduleFormValues>({
    defaultValues: {
      ...createFormValues(new Date(2026, 7, 4)),
      colorHex: "#F5A3A3",
    },
  });
  return (
    <FormProvider {...form}>
      <ColorField />
    </FormProvider>
  );
}

beforeEach(() => {
  jest
    .mocked(useTranslation)
    .mockReturnValue({ t: (key: string) => key } as never);
  jest.mocked(useAppLanguage).mockReturnValue({ language: "ko" } as never);
});

it("팔레트에서 색상을 조작한 뒤 무지개 칩 선택을 유지한다", async () => {
  let field!: ReturnType<typeof TestRenderer.create>;

  await TestRenderer.act(() => {
    field = TestRenderer.create(createElement(Harness));
  });

  const customOption = () =>
    field.root.findByProps({
      accessibilityLabel: "scheduleForm.color.customOption",
    });

  expect(customOption().props.accessibilityState).toEqual({ checked: false });

  await TestRenderer.act(() => customOption().props.onPress());

  expect(field.root.findByType(Modal).props.visible).toBe(true);
  expect(customOption().props.accessibilityState).toEqual({ checked: false });
  expect(form.getValues("colorHex")).toBe("#F5A3A3");

  await TestRenderer.act(() =>
    field.root
      .findByProps({ accessibilityLabel: "scheduleForm.color.hueLabel" })
      .props.onAccessibilityAction({
        nativeEvent: { actionName: "increment" },
      })
  );
  await TestRenderer.act(() =>
    field.root
      .findByProps({ accessibilityLabel: "scheduleForm.actions.done" })
      .props.onPress()
  );

  expect(form.getValues("colorHex")).toBe("#F5B8A3");
  expect(customOption().props.accessibilityState).toEqual({ checked: true });
  expect(field.root.findByType(Modal).props.visible).toBe(false);
});

it("비동기로 불러온 사용자 지정 색상을 무지개 칩에 표시한다", async () => {
  let field!: ReturnType<typeof TestRenderer.create>;

  await TestRenderer.act(() => {
    field = TestRenderer.create(createElement(Harness));
  });
  await TestRenderer.act(() => {
    form.reset({ ...form.getValues(), colorHex: "#123456" });
  });

  expect(
    field.root.findByProps({
      accessibilityLabel: "scheduleForm.color.customOption",
    }).props.accessibilityState
  ).toEqual({ checked: true });
});
