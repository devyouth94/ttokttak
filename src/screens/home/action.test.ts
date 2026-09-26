import { createElement, type ReactElement } from "react";

import {
  logFixture,
  scheduleFixture,
  testTimezone as timezone,
} from "~/schedule/fixtures";
import { createOccurrences, toUtcRange } from "~/schedule/rules/occurrence";
import { recordOccurrences } from "~/schedule/write";
import { captureException } from "~/sentry";

import { processHomeOccurrence, useHomeActions } from "./action";

declare const require: (moduleName: string) => unknown;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("~/schedule/write", () => ({ recordOccurrences: jest.fn() }));
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
    jest.mocked(recordOccurrences).mockResolvedValue(undefined);
  });

  it("완료 기록을 만든 뒤 알림과 화면 데이터를 새로 맞춘다", async () => {
    const item = scheduleFixture({ id: "item-1", recurrenceType: "once" });
    const syncDeviceOutputs = jest.fn(async () => undefined);

    await processHomeOccurrence({
      action: "completed",
      logs: [],
      now,
      syncDeviceOutputs,
      target: { item, occurrence: occurrence(item) },
      timezone,
      userId: "user-1",
    });

    expect(recordOccurrences).toHaveBeenCalledWith({
      action: "completed",
      itemId: "item-1",
      scheduledAtUtc: ["2026-04-10T00:00:00.000Z"],
      syncDeviceOutputs,
      userId: "user-1",
    });
  });

  it("지난 일정을 처리하면 이전 미처리 occurrence도 함께 기록한다", async () => {
    const item = scheduleFixture({
      id: "item-1",
      intervalValue: 3,
      recurrenceType: "interval_days",
      startDateLocal: "2026-04-04",
    });
    const overdue = createOccurrences({
      logs: [],
      now,
      schedules: [item],
      timezone,
    })
      .range(
        {
          endUtc: now.toISOString(),
          startUtc: toUtcRange(item.startDateLocal, timezone).startUtc,
        },
        "overdue"
      )
      .at(-1)!.occurrence;

    await processHomeOccurrence({
      action: "skipped",
      logs: [
        logFixture({
          itemId: item.id,
          scheduledAtUtc: "2026-04-04T00:00:00.000Z",
        }),
      ],
      now,
      syncDeviceOutputs: jest.fn(async () => undefined),
      target: { item, occurrence: overdue },
      timezone,
      userId: "user-1",
    });

    expect(recordOccurrences).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "skipped",
        itemId: "item-1",
        scheduledAtUtc: ["2026-04-07T00:00:00.000Z"],
        userId: "user-1",
      })
    );
  });

  it("이미 처리된 occurrence도 빈 대상으로 쓰기 후처리를 요청한다", async () => {
    const item = scheduleFixture({ id: "item-1", recurrenceType: "once" });
    const targetOccurrence = occurrence(item);

    await processHomeOccurrence({
      action: "skipped",
      logs: [
        logFixture({
          itemId: item.id,
          scheduledAtUtc: targetOccurrence.scheduledAtUtc,
        }),
      ],
      now,
      syncDeviceOutputs: jest.fn(async () => undefined),
      target: { item, occurrence: targetOccurrence },
      timezone,
      userId: "user-1",
    });

    expect(recordOccurrences).toHaveBeenCalledWith(
      expect.objectContaining({ scheduledAtUtc: [] })
    );
  });

  it("처리 실패 메시지를 남기고 처리 상태를 해제한다", async () => {
    const error = new Error("처리 실패");
    const item = scheduleFixture({ id: "item-1", recurrenceType: "once" });
    let actions!: ReturnType<typeof useHomeActions>;

    jest.mocked(recordOccurrences).mockRejectedValueOnce(error);

    await TestRenderer.act(async () => {
      TestRenderer.create(
        createElement(HomeActionsProbe, {
          onChange: (nextActions) => {
            actions = nextActions;
          },
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
}: {
  onChange: (actions: ReturnType<typeof useHomeActions>) => void;
}): null {
  onChange(
    useHomeActions({
      completionLogs: [],
      syncDeviceOutputs: jest.fn(async () => undefined),
      timezone,
      userId: "user-1",
    })
  );

  return null;
}
