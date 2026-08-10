import { createElement, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { router } from "expo-router";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { useAppLanguage } from "~/i18n/provider";
import { useNotifications } from "~/notifications/provider";
import { scheduleFixture } from "~/schedule/fixtures";
import { useScheduleById } from "~/schedule/query";
import {
  archiveSchedule,
  createSchedule,
  updateSchedule,
} from "~/schedule/write";
import { useSession } from "~/session/provider";

import { useScheduleForm } from "./form";

declare const require: (moduleName: string) => unknown;

jest.mock("react-i18next", () => ({ useTranslation: jest.fn() }));
jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(),
    replace: jest.fn(),
  },
}));
jest.mock("~/i18n/provider", () => ({ useAppLanguage: jest.fn() }));
jest.mock("~/notifications/provider", () => ({
  useNotifications: jest.fn(),
}));
jest.mock("~/schedule/query", () => ({ useScheduleById: jest.fn() }));
jest.mock("~/schedule/write", () => ({
  archiveSchedule: jest.fn(),
  createSchedule: jest.fn(),
  updateSchedule: jest.fn(),
}));
jest.mock("~/session/provider", () => ({ useSession: jest.fn() }));

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => unknown;
};

const t = (key: string): string => key;
const syncNotifications = jest.fn(async () => undefined);

describe("일정 폼", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-04T09:00:00+09:00"));

    jest.mocked(useTranslation).mockReturnValue({ t } as never);
    jest.mocked(useAppLanguage).mockReturnValue({ language: "ko" } as never);
    jest
      .mocked(useNotifications)
      .mockReturnValue({ syncNotifications } as never);
    jest.mocked(useSession).mockReturnValue({
      profile: { timezone: "Asia/Seoul" },
      status: "ready",
      user: { id: "user-1" },
    } as never);
    jest.mocked(useScheduleById).mockReturnValue({
      error: null,
      isLoading: false,
      isReady: true,
      item: null,
      refetch: jest.fn(),
      timezone: "Asia/Seoul",
      userId: "user-1",
    } as never);
    jest.mocked(createSchedule).mockResolvedValue(scheduleFixture());
    jest.mocked(updateSchedule).mockResolvedValue(scheduleFixture());
    jest.mocked(archiveSchedule).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("생성 초기값과 반복·종료일 변경 결과를 제공한다", async () => {
    const form = await renderForm();

    expect(form.current.values).toMatchObject({
      endDateLocal: null,
      recurrenceType: "daily",
      startDateLocal: "2026-08-04",
      title: "",
    });

    await TestRenderer.act(async () => {
      form.current.actions.recurrence.onSelectRecurrence("weekly");
      form.current.actions.recurrence.onEnableEndDate();
    });

    expect(form.current.values).toMatchObject({
      endDateLocal: "2026-08-04",
      recurrenceType: "weekly",
      weekdayMask: [2],
    });

    await TestRenderer.act(async () => {
      form.current.actions.picker.onOpenEndDatePicker();
    });
    await TestRenderer.act(async () => {
      form.current.actions.picker.onEndDatePickerChange(
        { type: "set" } as DateTimePickerEvent,
        new Date(2026, 7, 10, 12)
      );
    });
    await TestRenderer.act(async () => {
      form.current.actions.picker.onConfirmIosPicker();
    });

    expect(form.current.values.endDateLocal).toBe("2026-08-10");

    await TestRenderer.act(async () => {
      form.current.actions.recurrence.onDisableEndDate();
    });

    expect(form.current.values.endDateLocal).toBeNull();
  });

  it("잘못된 입력은 화면 인터페이스에 오류를 제공한다", async () => {
    const form = await renderForm();

    await TestRenderer.act(async () => {
      form.current.actions.screen.onSubmit();
    });

    expect(form.current.errors.title).toBe("제목을 입력해 주세요.");
    expect(form.current.state.error).toBe("scheduleForm.error.checkInput");
  });

  it("날짜 선택기의 시작일 선택을 폼 값에 반영한다", async () => {
    const form = await renderForm();

    await TestRenderer.act(async () => {
      form.current.actions.picker.onOpenDatePicker();
    });
    await TestRenderer.act(async () => {
      form.current.actions.picker.onStartDatePickerChange(
        { type: "set" } as DateTimePickerEvent,
        new Date(2026, 7, 5, 12)
      );
    });
    await TestRenderer.act(async () => {
      form.current.actions.picker.onConfirmIosPicker();
    });

    expect(form.current.values.startDateLocal).toBe("2026-08-05");
  });

  it("생성 입력을 저장 계약으로 전달한다", async () => {
    const form = await renderForm({ returnTo: "/schedule" });

    await TestRenderer.act(async () => {
      form.current.actions.field.onChangeTitle("아침 영양제");
      form.current.actions.screen.onSubmit();
    });

    expect(createSchedule).toHaveBeenCalledWith({
      input: expect.objectContaining({
        colorKey: "red",
        recurrenceType: "daily",
        startDateLocal: "2026-08-04",
        title: "아침 영양제",
      }),
      syncNotifications,
      timezone: "Asia/Seoul",
      userId: "user-1",
    });
    expect(router.replace).toHaveBeenCalledWith("/schedule");
  });

  it("수정 초기값을 불러오고 수정·삭제 동작을 전달한다", async () => {
    jest.mocked(useScheduleById).mockReturnValue({
      error: null,
      isLoading: false,
      isReady: true,
      item: scheduleFixture({
        id: "item-1",
        startDateLocal: "2026-07-01",
        title: "기존 일정",
      }),
      refetch: jest.fn(),
      timezone: "Asia/Seoul",
      userId: "user-1",
    } as never);
    const alert = jest.spyOn(Alert, "alert");
    const form = await renderForm({ itemId: "item-1" });

    expect(form.current.values).toMatchObject({
      startDateLocal: "2026-07-01",
      title: "기존 일정",
    });
    expect(form.current.state).toMatchObject({
      isEdit: true,
      isLoading: false,
      isStartDateEditable: false,
    });

    await TestRenderer.act(async () => {
      form.current.actions.recurrence.onEnableEndDate();
    });

    expect(form.current.values.endDateLocal).toBe("2026-08-04");

    await TestRenderer.act(async () => {
      form.current.actions.field.onChangeTitle("수정한 일정");
      form.current.actions.screen.onSubmit();
    });

    expect(updateSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "item-1",
        patch: expect.objectContaining({ title: "수정한 일정" }),
      })
    );

    form.current.actions.screen.onDelete();
    const buttons = alert.mock.calls.at(-1)?.[2];
    const confirm = buttons?.find((button) => button.style === "destructive");

    await TestRenderer.act(async () => {
      confirm?.onPress?.();
    });

    expect(archiveSchedule).toHaveBeenCalledWith({
      itemId: "item-1",
      syncNotifications,
    });
  });
});

async function renderForm(
  params: { itemId?: string; returnTo?: string } = {}
): Promise<{ current: ReturnType<typeof useScheduleForm> }> {
  let current!: ReturnType<typeof useScheduleForm>;

  await TestRenderer.act(async () => {
    TestRenderer.create(
      createElement(FormProbe, {
        ...params,
        onChange: (form) => {
          current = form;
        },
      })
    );
  });

  return {
    get current() {
      return current;
    },
  };
}

function FormProbe({
  itemId,
  onChange,
  returnTo,
}: {
  itemId?: string;
  onChange: (form: ReturnType<typeof useScheduleForm>) => void;
  returnTo?: string;
}): null {
  onChange(useScheduleForm({ itemId, returnTo }));

  return null;
}
