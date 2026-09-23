import { createElement, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { router } from "expo-router";

import { useDeviceSync } from "~/device-sync";
import { useAppLanguage } from "~/i18n/provider";
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
    replace: jest.fn(),
  },
}));
jest.mock("~/i18n/provider", () => ({ useAppLanguage: jest.fn() }));
jest.mock("~/device-sync", () => ({
  useDeviceSync: jest.fn(),
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
  create: (element: ReactElement) => {
    update: (element: ReactElement) => void;
  };
};

const t = (key: string): string => key;
const syncDeviceOutputs = jest.fn(async () => undefined);

describe("일정 폼", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-04T09:00:00+09:00"));

    jest.mocked(useTranslation).mockReturnValue({ t } as never);
    jest.mocked(useAppLanguage).mockReturnValue({ language: "ko" } as never);
    jest.mocked(useDeviceSync).mockReturnValue({ syncDeviceOutputs } as never);
    jest.mocked(useSession).mockReturnValue({
      profile: { timezone: "Asia/Seoul" },
      status: "ready",
      user: { id: "user-1" },
    } as never);
    mockSchedule(null);
    jest.mocked(createSchedule).mockResolvedValue(scheduleFixture());
    jest.mocked(updateSchedule).mockResolvedValue(scheduleFixture());
    jest.mocked(archiveSchedule).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ["loading", true, null],
    ["ready", true, null],
    ["error", false, "scheduleForm.error.editLoadFailed"],
    ["signedOut", false, "scheduleForm.error.editLoadFailed"],
  ] as const)(
    "일정 조회 대기 중 세션 %s의 수정 로딩과 오류를 판정한다",
    async (status, isLoading, loadError) => {
      jest.mocked(useSession).mockReturnValue({
        profile: null,
        status,
        user: status === "signedOut" ? null : { id: "user-1" },
      } as never);
      const result = await renderForm({ itemId: "item-1" });
      expect(result.current.isLoading).toBe(isLoading);
      expect(result.current.loadError).toBe(loadError);
    }
  );

  it("생성 초기값과 입력 오류를 React Hook Form 계약으로 제공한다", async () => {
    const result = await renderForm();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.loadError).toBeNull();
    expect(result.current.form.getValues()).toMatchObject({
      endDateLocal: null,
      recurrenceType: "daily",
      startDateLocal: "2026-08-04",
      title: "",
    });

    await TestRenderer.act(async () => result.current.submit());

    expect(result.current.form.getFieldState("title").error?.message).toBe(
      "제목을 입력해 주세요."
    );
    expect(result.current.form.formState.errors.root?.message).toBe(
      "scheduleForm.error.checkInput"
    );
  });

  it("생성 입력을 저장 계약으로 전달한다", async () => {
    const result = await renderForm({ returnTo: "/schedule" });

    await TestRenderer.act(async () => {
      result.current.form.setValue("title", "아침 영양제");
      result.current.form.setValue("colorHex", "#F0B080");
      result.current.submit();
    });

    expect(createSchedule).toHaveBeenCalledWith({
      input: expect.objectContaining({
        colorHex: "#F0B080",
        recurrenceType: "daily",
        startDateLocal: "2026-08-04",
        title: "아침 영양제",
      }),
      syncDeviceOutputs,
      timezone: "Asia/Seoul",
      userId: "user-1",
    });
    expect(router.replace).toHaveBeenCalledWith("/schedule");
  });

  it("수정 입력과 삭제를 저장 경계로 전달한다", async () => {
    mockSchedule(
      scheduleFixture({
        id: "item-1",
        startDateLocal: "2026-07-01",
        title: "기존 일정",
      })
    );
    const alert = jest.spyOn(Alert, "alert");
    const result = await renderForm({ itemId: "item-1" });

    expect(result.current.form.getValues()).toMatchObject({
      startDateLocal: "2026-07-01",
      title: "기존 일정",
    });

    await TestRenderer.act(async () => {
      result.current.form.setValue("title", "수정한 일정");
      result.current.submit();
    });

    expect(updateSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "item-1",
        patch: expect.objectContaining({ title: "수정한 일정" }),
      })
    );

    result.current.remove();
    const buttons = alert.mock.calls.at(-1)?.[2];
    const confirm = buttons?.find((button) => button.style === "destructive");

    await TestRenderer.act(async () => {
      confirm?.onPress?.();
    });

    expect(archiveSchedule).toHaveBeenCalledWith({
      itemId: "item-1",
      syncDeviceOutputs,
    });
  });

  it("저장과 삭제가 진행 중일 때 서로와 중복 실행을 막는다", async () => {
    mockSchedule(scheduleFixture({ id: "item-1", title: "기존 일정" }));
    const updatePending = deferred<ReturnType<typeof scheduleFixture>>();
    const archivePending = deferred<void>();
    const alert = jest.spyOn(Alert, "alert");

    jest.mocked(updateSchedule).mockReturnValue(updatePending.promise);
    jest.mocked(archiveSchedule).mockReturnValue(archivePending.promise);

    const result = await renderForm({ itemId: "item-1" });

    await TestRenderer.act(async () => {
      result.current.form.setValue("title", "수정한 일정");
      result.current.submit();
      await Promise.resolve();
    });

    await TestRenderer.act(async () => {
      result.current.submit();
      result.current.remove();
    });

    expect(updateSchedule).toHaveBeenCalledTimes(1);
    expect(alert).not.toHaveBeenCalled();

    await TestRenderer.act(async () => {
      updatePending.resolve(scheduleFixture());
    });

    jest.mocked(updateSchedule).mockClear();
    result.current.remove();

    const buttons = alert.mock.calls.at(-1)?.[2];
    const confirm = buttons?.find((button) => button.style === "destructive");

    await TestRenderer.act(async () => {
      confirm?.onPress?.();
      await Promise.resolve();
    });

    result.current.submit();

    expect(updateSchedule).not.toHaveBeenCalled();

    await TestRenderer.act(async () => {
      archivePending.resolve(undefined);
    });
  });

  it("같은 일정의 재조회는 dirty draft를 보존하고 pristine 값은 갱신한다", async () => {
    mockSchedule(scheduleFixture({ id: "item-1", title: "기존 일정" }));
    const result = await renderForm({ itemId: "item-1" });

    await TestRenderer.act(async () => {
      result.current.form.setValue("title", "작성 중", { shouldDirty: true });
    });

    mockSchedule(scheduleFixture({ id: "item-1", title: "서버 변경" }));
    await result.rerender({ itemId: "item-1" });

    expect(result.current.form.getValues("title")).toBe("작성 중");

    await TestRenderer.act(async () => result.current.form.reset());
    await result.rerender({ itemId: "item-1" });

    expect(result.current.form.getValues("title")).toBe("서버 변경");
  });

  it.each([new Error("저장 실패"), { message: "저장 실패" }, "저장 실패"])(
    "저장 오류의 메시지를 표시하고 입력을 보존한다: %p",
    async (error) => {
      jest.mocked(createSchedule).mockRejectedValue(error);
      const result = await renderForm();
      await TestRenderer.act(async () => {
        result.current.form.setValue("title", "작성 중", { shouldDirty: true });
        result.current.submit();
      });
      expect(result.current.form.formState.errors.root?.message).toBe(
        "저장 실패"
      );
      expect(result.current.form.getValues("title")).toBe("작성 중");
      expect(router.replace).not.toHaveBeenCalled();
    }
  );

  it("다른 일정으로 이동하면 기존 dirty draft를 교체한다", async () => {
    mockSchedule(scheduleFixture({ id: "item-1", title: "첫 일정" }));
    const result = await renderForm({ itemId: "item-1" });

    await TestRenderer.act(async () => {
      result.current.form.setValue("title", "작성 중", { shouldDirty: true });
    });

    mockSchedule(scheduleFixture({ id: "item-2", title: "두 번째 일정" }));
    await result.rerender({ itemId: "item-2" });

    expect(result.current.form.getValues("title")).toBe("두 번째 일정");
  });
});

function mockSchedule(item: ReturnType<typeof scheduleFixture> | null): void {
  jest.mocked(useScheduleById).mockReturnValue({
    data: item ?? undefined,
    error: null,
    isPending: !item,
    refetch: jest.fn(),
  } as never);
}

function deferred<Value>(): {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
} {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((fulfill) => {
    resolve = fulfill;
  });

  return { promise, resolve };
}

async function renderForm(
  params: { itemId?: string; returnTo?: string } = {}
): Promise<{
  current: ReturnType<typeof useScheduleForm>;
  rerender: (nextParams?: {
    itemId?: string;
    returnTo?: string;
  }) => Promise<void>;
}> {
  let current!: ReturnType<typeof useScheduleForm>;
  let renderer!: ReturnType<typeof TestRenderer.create>;

  const element = (nextParams = params) =>
    createElement(FormProbe, {
      ...nextParams,
      onChange: (form) => {
        current = form;
      },
    });

  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(element());
  });

  return {
    get current() {
      return current;
    },
    async rerender(nextParams = params) {
      await TestRenderer.act(async () => renderer.update(element(nextParams)));
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
