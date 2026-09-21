import { formatInTimeZone } from "date-fns-tz";

import {
  createOccurrences,
  type OccurrenceLog,
  toUtcRange,
} from "./occurrence";
import type { RuleVersion } from "./recurrence";
import { assertInput } from "./validate";
import {
  type CreateScheduleInput,
  currentRule,
  type Schedule,
} from "../schedule";

export type EditScheduleInput = Partial<
  Omit<CreateScheduleInput, "startDateLocal">
>;

type EditResult = {
  item: Pick<CreateScheduleInput, "colorHex" | "description" | "title">;
  version: RuleVersion | null;
};

function toInput(item: Schedule): CreateScheduleInput {
  const rule = currentRule(item);

  return {
    anchorType: rule.anchorType,
    colorHex: item.colorHex,
    description: item.description,
    endDateLocal: rule.endDateLocal,
    intervalValue: rule.intervalValue,
    notificationsEnabled: rule.notificationsEnabled,
    recurrenceType: rule.recurrenceType,
    reminderTimeLocal: rule.reminderTimeLocal,
    startDateLocal: item.startDateLocal,
    title: item.title,
    weekdayMask: rule.weekdayMask,
  };
}

function ruleChanged(item: Schedule, input: CreateScheduleInput): boolean {
  const rule = currentRule(item);

  return (
    rule.recurrenceType !== input.recurrenceType ||
    rule.intervalValue !== input.intervalValue ||
    rule.reminderTimeLocal !== input.reminderTimeLocal ||
    rule.endDateLocal !== input.endDateLocal ||
    rule.notificationsEnabled !== input.notificationsEnabled ||
    rule.anchorType !== input.anchorType ||
    JSON.stringify(rule.weekdayMask) !== JSON.stringify(input.weekdayMask)
  );
}

function itemChanged(item: Schedule, input: CreateScheduleInput): boolean {
  return (
    item.title !== input.title ||
    item.description !== input.description ||
    item.colorHex !== input.colorHex
  );
}

function nextStartDate({
  completionLogs,
  effectiveFromUtc,
  item,
  version,
  timezone,
}: {
  completionLogs: OccurrenceLog[];
  effectiveFromUtc: string;
  item: Schedule;
  version: Omit<RuleVersion, "seedStartDateLocal">;
  timezone: string;
}): string | null {
  const previousDate =
    createOccurrences({
      logs: completionLogs,
      now: new Date(effectiveFromUtc),
      schedules: [item],
      timezone,
    })
      .range({
        endUtc: effectiveFromUtc,
        startUtc: toUtcRange(item.startDateLocal, timezone).startUtc,
      })
      .filter(({ occurrence }) => occurrence.scheduledAtUtc < effectiveFromUtc)
      .at(-1)?.occurrence.localDate ?? item.startDateLocal;
  const edited: Schedule = {
    ...item,
    versions: [{ ...version, seedStartDateLocal: previousDate }],
  };

  return (
    createOccurrences({
      logs: completionLogs,
      now: new Date(effectiveFromUtc),
      schedules: [edited],
      timezone,
    }).next(item.id)?.localDate ?? null
  );
}

/** 수정 입력을 저장할 일정 값과 새 규칙 버전으로 계산한다. */
export function resolveEdit({
  completionLogs,
  input: changes,
  item,
  now,
  timezone,
}: {
  completionLogs: OccurrenceLog[];
  input: EditScheduleInput;
  item: Schedule;
  now: Date;
  timezone: string;
}): EditResult | null {
  const merged: CreateScheduleInput = {
    ...toInput(item),
    ...changes,
    startDateLocal: item.startDateLocal,
  };
  const input: CreateScheduleInput = {
    ...merged,
    endDateLocal: merged.recurrenceType === "once" ? null : merged.endDateLocal,
  };
  const validatesNewEndDate =
    Object.prototype.hasOwnProperty.call(changes, "endDateLocal") &&
    changes.endDateLocal != null;

  assertInput(input, {
    minimumEndDateLocal: validatesNewEndDate
      ? formatInTimeZone(now, timezone, "yyyy-MM-dd")
      : undefined,
  });

  const hasRuleChanges = ruleChanged(item, input);

  if (!itemChanged(item, input) && !hasRuleChanges) {
    return null;
  }

  const result: EditResult = {
    item: {
      colorHex: input.colorHex,
      description: input.description,
      title: input.title,
    },
    version: null,
  };

  if (!hasRuleChanges) {
    return result;
  }

  const effectiveFromUtc = now.toISOString();
  const version = {
    anchorType: input.anchorType,
    effectiveFromUtc,
    endDateLocal: input.endDateLocal,
    intervalValue: input.intervalValue,
    notificationsEnabled: input.notificationsEnabled,
    recurrenceType: input.recurrenceType,
    reminderTimeLocal: input.reminderTimeLocal,
    weekdayMask: input.weekdayMask,
  };

  return {
    ...result,
    version: {
      ...version,
      seedStartDateLocal:
        nextStartDate({
          completionLogs,
          effectiveFromUtc,
          item,
          timezone,
          version,
        }) ?? item.startDateLocal,
    },
  };
}
