import {
  createElement,
  createRef,
  type ReactElement,
  type RefObject,
} from "react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { LayoutChangeEvent, TextInput } from "react-native";

import { useThemeColors } from "~/theme/provider";

import { ContentFields } from "./content-fields";
import { createFormValues, type ScheduleFormValues } from "../form-values";

declare const require: (moduleName: string) => unknown;

jest.mock("react-i18next", () => ({ useTranslation: jest.fn() }));
jest.mock("~/theme/provider", () => ({ useThemeColors: jest.fn() }));
jest.mock("~/ui/app-text", () => ({ AppText: "AppText" }));

type TestInstance = {
  findByProps: (props: Record<string, unknown>) => TestInstance;
  props: {
    multiline?: boolean;
    onChangeText?: (value: string) => void;
    onLayout?: (event: LayoutChangeEvent) => void;
  };
};

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (
    element: ReactElement,
    options?: {
      createNodeMock: (element: { props: Record<string, unknown> }) => unknown;
    }
  ) => { root: TestInstance };
};

beforeEach(() => {
  jest
    .mocked(useTranslation)
    .mockReturnValue({ t: (key: string) => key } as never);
  jest.mocked(useThemeColors).mockReturnValue({
    border: "#DDD",
    error: "#F00",
    primary: "#111",
    text: "#111",
    textMuted: "#777",
  } as never);
});

it("제목 ref와 폼 이벤트를 연결하고 multiline 설명 입력을 유지한다", async () => {
  let form!: UseFormReturn<ScheduleFormValues>;
  let view!: ReturnType<typeof TestRenderer.create>;
  const onTitleLayout = jest.fn();
  const titleInputRef = createRef<TextInput>();
  const titleInputNode = { focus: jest.fn() };

  await TestRenderer.act(() => {
    view = TestRenderer.create(
      createElement(ContentFieldsHarness, {
        onForm: (currentForm) => {
          form = currentForm;
        },
        onTitleLayout,
        titleInputRef,
      }),
      {
        createNodeMock: (element) =>
          element.props.accessibilityLabel === "scheduleForm.fields.title"
            ? titleInputNode
            : null,
      }
    );
  });

  expect(typeof titleInputRef.current?.focus).toBe("function");

  await TestRenderer.act(() => {
    form.setError("root", { message: "저장 실패" });
    view.root
      .findByProps({ accessibilityLabel: "scheduleForm.fields.title" })
      .props.onChangeText?.("아침 영양제");
  });

  expect(form.getValues("title")).toBe("아침 영양제");
  expect(form.formState.errors.root).toBeUndefined();
  expect(
    view.root.findByProps({
      accessibilityLabel: "scheduleForm.fields.descriptionA11y",
    }).props.multiline
  ).toBe(true);

  const layoutEvent = {
    nativeEvent: { layout: { height: 48, width: 320, x: 0, y: 120 } },
  } as LayoutChangeEvent;
  view.root
    .findByProps({ onLayout: onTitleLayout })
    .props.onLayout?.(layoutEvent);
  expect(onTitleLayout).toHaveBeenCalledWith(layoutEvent);
});

type ContentFieldsHarnessProps = {
  onForm: (form: UseFormReturn<ScheduleFormValues>) => void;
  onTitleLayout: (event: LayoutChangeEvent) => void;
  titleInputRef: RefObject<TextInput | null>;
};

function ContentFieldsHarness({
  onForm,
  onTitleLayout,
  titleInputRef,
}: ContentFieldsHarnessProps): React.JSX.Element {
  const form = useForm<ScheduleFormValues>({
    defaultValues: createFormValues(new Date(2026, 7, 4, 9)),
  });

  onForm(form);

  return (
    <FormProvider {...form}>
      <ContentFields
        onTitleLayout={onTitleLayout}
        titleInputRef={titleInputRef}
      />
    </FormProvider>
  );
}
