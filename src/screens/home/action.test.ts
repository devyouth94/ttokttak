import { createElement, type ReactElement } from "react";

import { scheduleFixture, testTimezone as timezone } from "~/schedule/fixtures";
import { toUtcRange } from "~/schedule/local-date";
import { createOccurrences } from "~/schedule/rules/occurrence";
import { processOccurrence } from "~/schedule/write";
import { captureException } from "~/sentry";

import { useHomeActions } from "./action";

declare const require: (moduleName: string) => unknown;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("~/schedule/write", () => ({ processOccurrence: jest.fn() }));
jest.mock("~/sentry", () => ({ captureException: jest.fn() }));

const now = new Date("2026-04-10T03:00:00.000Z");
const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => unknown;
};

function occurrence(item = scheduleFixture({ recurrenceType: "once" })) {
  return createOccurrences({
    logs: [],
    now,
    schedules: [item],
    timezone,
  }).range(toUtcRange("2026-04-10", timezone))[0]!.occurrence;
}

describe("홈 occurrence 처리", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(processOccurrence).mockResolvedValue(undefined);
  });

  it("동시 처리 중 한 건이 실패해도 다른 건의 진행 상태를 유지한다", async () => {
    const error = new Error("처리 실패");
    const first = deferred();
    const second = deferred();
    let actions!: ReturnType<typeof useHomeActions>;
    jest
      .mocked(processOccurrence)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    await TestRenderer.act(async () => {
      TestRenderer.create(
        createElement(HomeActionsProbe, {
          onChange: (next) => {
            actions = next;
          },
          syncDeviceOutputs: jest.fn(async () => undefined),
        })
      );
    });
    const target = (id: string) => {
      const item = scheduleFixture({ id, recurrenceType: "once" });
      return { id, item, occurrence: occurrence(item) };
    };
    let firstRun!: Promise<void>;
    let secondRun!: Promise<void>;
    await TestRenderer.act(() => {
      firstRun = actions.runAction(target("first"), "completed");
      secondRun = actions.runAction(target("second"), "skipped");
    });
    expect(actions.processingIds).toEqual(["first", "second"]);
    await TestRenderer.act(async () => {
      first.reject(error);
      await firstRun;
    });
    expect(actions.processingIds).toEqual(["second"]);
    expect(actions.errorMessage).toBe("home.feed.actionErrorDescription");
    expect(captureException).toHaveBeenCalledWith(error);
    await TestRenderer.act(async () => {
      second.resolve();
      await secondRun;
    });
    expect(actions.processingIds).toEqual([]);
  });
});

function HomeActionsProbe({
  onChange,
  syncDeviceOutputs,
}: {
  onChange: (actions: ReturnType<typeof useHomeActions>) => void;
  syncDeviceOutputs: () => Promise<void>;
}): null {
  onChange(
    useHomeActions({
      completionLogs: [],
      syncDeviceOutputs,
      timezone,
      userId: "user-1",
    })
  );

  return null;
}

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
