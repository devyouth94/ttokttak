import { createElement, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { router } from "expo-router";

import { useDeviceSync } from "~/device-sync";
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
  router: { replace: jest.fn() },
}));
jest.mock("~/device-sync", () => ({ useDeviceSync: jest.fn() }));
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

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useTranslation)
    .mockReturnValue({ t: (key: string) => key } as never);
  jest.mocked(useDeviceSync).mockReturnValue({
    syncDeviceOutputs: jest.fn(async () => undefined),
  } as never);
  jest.mocked(useSession).mockReturnValue({
    profile: { timezone: "Asia/Seoul" },
    status: "ready",
    user: { id: "user-1" },
  } as never);
  jest.mocked(archiveSchedule).mockResolvedValue();
  jest.mocked(createSchedule).mockResolvedValue();
  jest.mocked(updateSchedule).mockResolvedValue();
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  mockSchedule(null);
});

it("같은 일정의 재조회는 dirty draft를 보존하고 다른 일정은 새 값으로 초기화한다", async () => {
  mockSchedule(scheduleFixture({ id: "item-1", title: "첫 일정" }));
  const result = await renderForm({ itemId: "item-1" });

  await TestRenderer.act(async () => {
    result.current.form.setValue("title", "작성 중", { shouldDirty: true });
  });
  mockSchedule(scheduleFixture({ id: "item-1", title: "서버 변경" }));
  await result.rerender({ itemId: "item-1" });
  expect(result.current.form.getValues("title")).toBe("작성 중");

  mockSchedule(scheduleFixture({ id: "item-2", title: "두 번째 일정" }));
  await result.rerender({ itemId: "item-2" });
  expect(result.current.form.getValues("title")).toBe("두 번째 일정");
});

it("저장 실패 뒤 입력을 보존하고 재시도 중 중복 쓰기 없이 성공한다", async () => {
  const firstStarted = deferred<void>();
  const retryStarted = deferred<void>();
  const retry = deferred<void>();
  jest
    .mocked(createSchedule)
    .mockImplementationOnce(async () => {
      firstStarted.resolve();
      throw new Error("저장 실패");
    })
    .mockImplementationOnce(() => {
      retryStarted.resolve();
      return retry.promise;
    });
  const result = await renderForm();

  await TestRenderer.act(async () => {
    result.current.form.setValue("title", "작성 중", { shouldDirty: true });
    result.current.submit();
    await firstStarted.promise;
  });
  expect(result.current.form.getValues("title")).toBe("작성 중");
  expect(Alert.alert).toHaveBeenCalledWith(
    "scheduleForm.error.saveFailedTitle",
    "error.tryAgain"
  );
  expect(router.replace).not.toHaveBeenCalled();

  await TestRenderer.act(async () => {
    result.current.submit();
    await retryStarted.promise;
  });
  await TestRenderer.act(async () => {
    result.current.submit();
  });
  expect(createSchedule).toHaveBeenCalledTimes(2);
  expect(router.replace).not.toHaveBeenCalled();

  await TestRenderer.act(async () => {
    retry.resolve();
    await retry.promise;
  });
  expect(router.replace).toHaveBeenCalledWith("/");
});

it("수정 일정 로드 실패를 재시도 가능한 상태로 노출한다", async () => {
  const refetch = jest.fn(async () => undefined);
  jest.mocked(useScheduleById).mockReturnValue({
    data: undefined,
    error: new Error("조회 실패"),
    isPending: false,
    refetch,
  } as never);

  const result = await renderForm({ itemId: "item-1" });

  expect(result.current.loadFailed).toBe(true);
  await result.current.retryLoad();
  expect(refetch).toHaveBeenCalledTimes(1);
});

function mockSchedule(item: ReturnType<typeof scheduleFixture> | null): void {
  jest.mocked(useScheduleById).mockReturnValue({
    data: item ?? undefined,
    error: null,
    isPending: !item,
    refetch: jest.fn(),
  } as never);
}

async function renderForm(params: { itemId?: string; returnTo?: string } = {}) {
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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}
