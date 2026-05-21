import { formatInTimeZone } from "date-fns-tz";

import { getFirstFutureOccurrenceLocalDateAfterEdit } from "./occurrence";
import type { CompletionLog, RecurringItem, RecurringItemDraft } from "./types";
import { validateRecurringItemDraft } from "./validation";

export type RecurringItemEditPatch = Partial<
  Omit<RecurringItemDraft, "timezone">
>;

type RecurringItemEditPolicy = {
  hasAnyChanges: boolean;
  itemPatch: {
    colorKey: RecurringItemDraft["colorKey"];
    description: RecurringItemDraft["description"];
    isArchived: RecurringItemDraft["isArchived"];
    title: RecurringItemDraft["title"];
  };
  mergedDraft: RecurringItemDraft;
  metaChanged: boolean;
  ruleChanged: boolean;
  scheduleVersionCommand: {
    anchorType: RecurringItemDraft["anchorType"];
    effectiveFromUtc: string;
    endDateLocal: string | null;
    intervalValue: number | null;
    notificationsEnabled: boolean;
    recurrenceType: RecurringItemDraft["recurrenceType"];
    reminderTimeLocal: string;
    seedStartDateLocal: string | null;
    weekdayMask: number[] | null;
  } | null;
};

type ResolveRecurringItemEditPolicyParams = {
  completionLogs: CompletionLog[];
  item: RecurringItem;
  now: () => Date;
  patch: RecurringItemEditPatch;
  timezone: string;
};

function toRecurringItemDraftFromEntity(
  item: RecurringItem
): RecurringItemDraft {
  return {
    anchorType: item.anchorType,
    colorKey: item.colorKey,
    description: item.description,
    endDateLocal: item.endDateLocal,
    intervalValue: item.intervalValue,
    isArchived: item.isArchived,
    notificationsEnabled: item.notificationsEnabled,
    recurrenceType: item.recurrenceType,
    reminderTimeLocal: item.reminderTimeLocal,
    startDateLocal: item.startDateLocal,
    timezone: item.timezone,
    title: item.title,
    weekdayMask: item.weekdayMask,
  };
}

function assertValidDraft(
  draft: RecurringItemDraft,
  params: { minimumEndDateLocal?: string } = {}
): void {
  const issues = validateRecurringItemDraft(draft, {
    minimumEndDateLocal: params.minimumEndDateLocal,
  });

  if (issues.length === 0) {
    return;
  }

  throw new Error(issues.map((issue) => issue.message).join(" "));
}

function hasRuleChanges(
  item: RecurringItem,
  draft: RecurringItemDraft
): boolean {
  return (
    item.recurrenceType !== draft.recurrenceType ||
    item.intervalValue !== draft.intervalValue ||
    item.reminderTimeLocal !== draft.reminderTimeLocal ||
    (item.endDateLocal ?? null) !== (draft.endDateLocal ?? null) ||
    item.notificationsEnabled !== draft.notificationsEnabled ||
    item.anchorType !== draft.anchorType ||
    JSON.stringify(item.weekdayMask ?? null) !==
      JSON.stringify(draft.weekdayMask ?? null)
  );
}

function hasMetaChanges(
  item: RecurringItem,
  draft: RecurringItemDraft
): boolean {
  return (
    item.title !== draft.title ||
    item.description !== draft.description ||
    item.colorKey !== draft.colorKey ||
    item.isArchived !== draft.isArchived
  );
}

export function resolveRecurringItemEditPolicy({
  completionLogs,
  item,
  now,
  patch,
  timezone,
}: ResolveRecurringItemEditPolicyParams): RecurringItemEditPolicy {
  const mergedDraft: RecurringItemDraft = {
    ...toRecurringItemDraftFromEntity(item),
    ...patch,
    startDateLocal: item.startDateLocal,
    timezone,
  };
  const normalizedDraft: RecurringItemDraft = {
    ...mergedDraft,
    endDateLocal:
      mergedDraft.recurrenceType === "once"
        ? null
        : (mergedDraft.endDateLocal ?? null),
  };

  const editNow = now();
  const shouldValidateMinimumEndDate =
    Object.prototype.hasOwnProperty.call(patch, "endDateLocal") &&
    patch.endDateLocal != null;

  assertValidDraft(normalizedDraft, {
    minimumEndDateLocal: shouldValidateMinimumEndDate
      ? formatInTimeZone(editNow, timezone, "yyyy-MM-dd")
      : undefined,
  });

  const metaChanged = hasMetaChanges(item, normalizedDraft);
  const ruleChanged = hasRuleChanges(item, normalizedDraft);
  const hasAnyChanges = metaChanged || ruleChanged;
  const itemPatch = {
    colorKey: normalizedDraft.colorKey,
    description: normalizedDraft.description,
    isArchived: normalizedDraft.isArchived,
    title: normalizedDraft.title,
  };

  if (!ruleChanged) {
    return {
      hasAnyChanges,
      itemPatch,
      mergedDraft: normalizedDraft,
      metaChanged,
      ruleChanged,
      scheduleVersionCommand: null,
    };
  }

  const effectiveFromUtc = editNow.toISOString();
  const seedStartDateLocal =
    getFirstFutureOccurrenceLocalDateAfterEdit({
      completionLogs,
      effectiveFromUtc,
      item,
      nextSchedule: {
        anchorType: normalizedDraft.anchorType,
        endDateLocal: normalizedDraft.endDateLocal ?? null,
        intervalValue: normalizedDraft.intervalValue,
        recurrenceType: normalizedDraft.recurrenceType,
        reminderTimeLocal: normalizedDraft.reminderTimeLocal,
        weekdayMask: normalizedDraft.weekdayMask,
      },
      timezone,
    }) ?? item.startDateLocal;

  return {
    hasAnyChanges,
    itemPatch,
    mergedDraft: normalizedDraft,
    metaChanged,
    ruleChanged,
    scheduleVersionCommand: {
      anchorType: normalizedDraft.anchorType,
      effectiveFromUtc,
      endDateLocal: normalizedDraft.endDateLocal ?? null,
      intervalValue: normalizedDraft.intervalValue ?? null,
      notificationsEnabled: normalizedDraft.notificationsEnabled,
      recurrenceType: normalizedDraft.recurrenceType,
      reminderTimeLocal: normalizedDraft.reminderTimeLocal,
      seedStartDateLocal,
      weekdayMask: normalizedDraft.weekdayMask ?? null,
    },
  };
}
