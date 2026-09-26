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

  it("화면은 처리 의도와 현재 실행 문맥만 일정 명령에 전달한다", async () => {
    const item = scheduleFixture({ id: "item-1", recurrenceType: "once" });
    const syncDeviceOutputs = jest.fn(async () => undefined);
    let actions!: ReturnType<typeof useHomeActions>;
    await TestRenderer.act(async () => {
      TestRenderer.create(
        createElement(HomeActionsProbe, {
          onChange: (nextActions) => {
            actions = nextActions;
          },
          syncDeviceOutputs,
        })
      );
    });

    await TestRenderer.act(async () => {
      await actions.runAction(
        {
          id: "item-1:2026-04-10T00:00:00.000Z",
          item,
          occurrence: occurrence(item),
        },
        "completed"
      );
    });

    expect(processOccurrence).toHaveBeenCalledWith({
      action: "completed",
      logs: [],
      now: expect.any(Date),
      syncDeviceOutputs,
      target: { occurrence: occurrence(item), schedule: item },
      timezone,
      userId: "user-1",
    });
  });

  it("처리 실패 메시지를 남기고 처리 상태를 해제한다", async () => {
    const error = new Error("처리 실패");
    const item = scheduleFixture({ id: "item-1", recurrenceType: "once" });
    let actions!: ReturnType<typeof useHomeActions>;

    jest.mocked(processOccurrence).mockRejectedValueOnce(error);

    await TestRenderer.act(async () => {
      TestRenderer.create(
        createElement(HomeActionsProbe, {
          onChange: (nextActions) => {
            actions = nextActions;
          },
          syncDeviceOutputs: jest.fn(async () => undefined),
        })
      );
    });

    await TestRenderer.act(async () => {
      await actions.runAction(
        {
          id: "item-1:2026-04-10T00:00:00.000Z",
          item,
          occurrence: occurrence(item),
        },
        "completed"
      );
    });

    expect(captureException).toHaveBeenCalledWith(error);
    expect(actions.errorMessage).toBe("home.feed.actionErrorDescription");
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
