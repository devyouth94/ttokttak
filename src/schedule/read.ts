import { listItems } from "./db/items";
import { listLogs } from "./db/logs";
import type { OccurrenceLog, Schedule } from "./model";

export type ScheduleData = {
  logs: OccurrenceLog[];
  schedules: Schedule[];
};

export type ScheduleReadStep = <T>(
  stage: "items" | "logs",
  operation: () => Promise<T>
) => Promise<T>;

const runStep: ScheduleReadStep = (_stage, operation) => operation();

/** 활성 일정과 그 응답에 포함된 일정의 전체 처리 기록을 함께 읽는다. */
export async function readActiveScheduleData(
  { userId }: { userId: string },
  step: ScheduleReadStep = runStep
): Promise<ScheduleData> {
  const schedules = await step("items", () => listItems({ userId }));
  const itemIds = schedules.map((schedule) => schedule.id);
  const logs = itemIds.length
    ? await step("logs", () => listLogs({ itemIds, userId }))
    : [];

  return { logs, schedules };
}
