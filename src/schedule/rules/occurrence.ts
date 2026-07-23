import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import {
  firstDate,
  nextDate,
  type RecurrenceRule,
  type RuleVersion,
  supportsCompletion,
} from "./recurrence";
import type { Schedule } from "../schedule";

export type OccurrenceStatus =
  | "completed"
  | "overdue"
  | "scheduled"
  | "skipped";
export type OccurrenceAction = "completed" | "skipped";

export type OccurrenceLog = {
  id: string;
  itemId: string;
  scheduledAtUtc: string;
  action: OccurrenceAction;
  actedAtUtc: string;
};

export type Occurrence = {
  localDate: string;
  scheduledAtUtc: string;
  status: OccurrenceStatus;
};

export type UtcRange = {
  endUtc: string;
  startUtc: string;
};

export type OccurrenceEntry = {
  occurrence: Occurrence;
  schedule: Schedule;
};

type ScheduleLogs = {
  byTime: Map<string, OccurrenceLog>;
  completed: OccurrenceLog[];
};

type VersionRule = RecurrenceRule & {
  anchorType: RuleVersion["anchorType"];
  effectiveFromUtc: string;
  reminderTimeLocal: string;
};

/** local date 하루를 timezone 기준 UTC 범위로 바꾼다. */
export function toUtcRange(localDate: string, timezone: string): UtcRange {
  return {
    endUtc: fromZonedTime(`${localDate}T23:59:59.999`, timezone).toISOString(),
    startUtc: fromZonedTime(
      `${localDate}T00:00:00.000`,
      timezone
    ).toISOString(),
  };
}

function scheduledAt(
  localDate: string,
  reminderTimeLocal: string,
  timezone: string
): string {
  return fromZonedTime(
    `${localDate}T${reminderTimeLocal}:00`,
    timezone
  ).toISOString();
}

function toRule(version: RuleVersion): VersionRule {
  return {
    anchorType: version.anchorType,
    effectiveFromUtc: version.effectiveFromUtc,
    endDateLocal: version.endDateLocal,
    intervalValue: version.intervalValue,
    recurrenceType: version.recurrenceType,
    reminderTimeLocal: version.reminderTimeLocal,
    startDateLocal: version.seedStartDateLocal,
    weekdayMask: version.weekdayMask,
  };
}

function statusOf(
  scheduledAtUtc: string,
  logs: ScheduleLogs,
  nowUtc: string,
  timezone: string
): OccurrenceStatus {
  const action = logs.byTime.get(scheduledAtUtc)?.action;

  if (action) {
    return action;
  }

  return formatInTimeZone(scheduledAtUtc, timezone, "yyyy-MM-dd") <
    formatInTimeZone(nowUtc, timezone, "yyyy-MM-dd")
    ? "overdue"
    : "scheduled";
}

function completionAnchor(
  logs: ScheduleLogs,
  effectiveFromUtc: string,
  fallback: string,
  timezone: string
): string {
  const completed = logs.completed.find(
    ({ actedAtUtc }) => actedAtUtc < effectiveFromUtc
  );

  return completed
    ? formatInTimeZone(completed.actedAtUtc, timezone, "yyyy-MM-dd")
    : fallback;
}

/**
 * 일정과 처리 기록에서 occurrence를 계산하고 범위·다음·특정 시점으로 조회한다.
 * `range`는 입력 일정 순서를 유지하고 일정 안에서는 시간 오름차순으로 반환한다.
 */
export function createOccurrences({
  logs,
  now,
  schedules,
  timezone,
}: {
  logs: OccurrenceLog[];
  now: Date;
  schedules: Schedule[];
  timezone: string;
}) {
  const nowUtc = now.toISOString();
  const scheduleById = new Map(
    schedules.map((schedule) => [schedule.id, schedule])
  );
  const logsBySchedule = new Map<string, ScheduleLogs>();

  for (const log of logs) {
    const scheduleLogs = logsBySchedule.get(log.itemId) ?? {
      byTime: new Map<string, OccurrenceLog>(),
      completed: [],
    };
    scheduleLogs.byTime.set(log.scheduledAtUtc, log);

    if (log.action === "completed") {
      scheduleLogs.completed.push(log);
    }

    logsBySchedule.set(log.itemId, scheduleLogs);
  }

  for (const scheduleLogs of logsBySchedule.values()) {
    scheduleLogs.completed.sort((left, right) =>
      right.actedAtUtc.localeCompare(left.actedAtUtc)
    );
  }

  function* generate(schedule: Schedule): Generator<Occurrence> {
    const scheduleLogs = logsBySchedule.get(schedule.id) ?? {
      byTime: new Map(),
      completed: [],
    };

    for (
      let versionIndex = 0;
      versionIndex < schedule.versions.length;
      versionIndex += 1
    ) {
      const version = schedule.versions[versionIndex]!;
      const rule = toRule(version);
      const versionEndUtc =
        schedule.versions[versionIndex + 1]?.effectiveFromUtc ?? null;
      const completionBased =
        rule.anchorType === "completion_based" &&
        supportsCompletion(rule.recurrenceType);
      let anchorDate = completionBased
        ? completionAnchor(
            scheduleLogs,
            rule.effectiveFromUtc,
            rule.startDateLocal,
            timezone
          )
        : rule.startDateLocal;
      let localDate = firstDate(rule);

      // version은 다음 version의 적용 시각 직전 occurrence까지만 만든다.
      while (
        localDate &&
        (!rule.endDateLocal || localDate <= rule.endDateLocal)
      ) {
        const scheduledAtUtc = scheduledAt(
          localDate,
          rule.reminderTimeLocal,
          timezone
        );

        if (versionEndUtc && scheduledAtUtc >= versionEndUtc) {
          break;
        }

        if (scheduledAtUtc >= rule.effectiveFromUtc) {
          yield {
            localDate,
            scheduledAtUtc,
            status: statusOf(scheduledAtUtc, scheduleLogs, nowUtc, timezone),
          };
        }

        const log = scheduleLogs.byTime.get(scheduledAtUtc);

        // 완료일 기준은 완료한 local date만 anchor로 삼고 건너뛰기는 예정 흐름을 유지한다.
        if (completionBased && log?.action === "completed") {
          anchorDate = formatInTimeZone(log.actedAtUtc, timezone, "yyyy-MM-dd");
          localDate = nextDate(rule, anchorDate, anchorDate);
        } else {
          localDate = nextDate(rule, localDate, anchorDate);
        }
      }
    }
  }

  function range(
    utcRange: UtcRange,
    status?: OccurrenceStatus
  ): OccurrenceEntry[] {
    if (utcRange.startUtc > utcRange.endUtc) {
      return [];
    }

    return schedules.flatMap((schedule) => {
      const entries: OccurrenceEntry[] = [];

      for (const occurrence of generate(schedule)) {
        if (occurrence.scheduledAtUtc > utcRange.endUtc) {
          break;
        }

        if (
          occurrence.scheduledAtUtc >= utcRange.startUtc &&
          (!status || occurrence.status === status)
        ) {
          entries.push({ occurrence, schedule });
        }
      }

      return entries;
    });
  }

  function next(scheduleId: string): Occurrence | null {
    const schedule = scheduleById.get(scheduleId);

    if (!schedule) {
      return null;
    }

    for (const occurrence of generate(schedule)) {
      if (
        occurrence.scheduledAtUtc >= nowUtc &&
        occurrence.status === "scheduled"
      ) {
        return occurrence;
      }
    }

    return null;
  }

  function find(scheduleId: string, scheduledAtUtc: string): Occurrence | null {
    const schedule = scheduleById.get(scheduleId);

    if (!schedule) {
      return null;
    }

    for (const occurrence of generate(schedule)) {
      if (occurrence.scheduledAtUtc === scheduledAtUtc) {
        return occurrence;
      }

      if (occurrence.scheduledAtUtc > scheduledAtUtc) {
        return null;
      }
    }

    return null;
  }

  return { find, next, range };
}
