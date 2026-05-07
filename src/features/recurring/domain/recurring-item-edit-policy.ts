import { getFirstFutureOccurrenceLocalDateAfterEdit } from "~/features/recurring/domain/occurrence";
import type {
  CompletionLog,
  RecurringItem,
  RecurringItemDraft,
} from "~/features/recurring/domain/types";
import { validateRecurringItemDraft } from "~/features/recurring/domain/validation";

export type RecurringItemEditPatch = Partial<
  Omit<RecurringItemDraft, "timezone">
>;

type RecurringItemEditPolicy = {
  effectiveFromUtc: string | null;
  hasAnyChanges: boolean;
  mergedDraft: RecurringItemDraft;
  metaChanged: boolean;
  ruleChanged: boolean;
  seedStartDateLocal: string | null;
};

type ResolveRecurringItemEditPolicyParams = {
  completionLogs?: CompletionLog[];
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
    category: item.category,
    colorKey: item.colorKey,
    description: item.description,
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

function assertValidDraft(draft: RecurringItemDraft): void {
  const issues = validateRecurringItemDraft(draft);

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
    item.category !== draft.category ||
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

  assertValidDraft(mergedDraft);

  const metaChanged = hasMetaChanges(item, mergedDraft);
  const ruleChanged = hasRuleChanges(item, mergedDraft);
  const hasAnyChanges = metaChanged || ruleChanged;

  if (!ruleChanged) {
    return {
      effectiveFromUtc: null,
      hasAnyChanges,
      mergedDraft,
      metaChanged,
      ruleChanged,
      seedStartDateLocal: null,
    };
  }

  const effectiveFromUtc = now().toISOString();
  const seedStartDateLocal = completionLogs
    ? (getFirstFutureOccurrenceLocalDateAfterEdit({
        completionLogs,
        effectiveFromUtc,
        item,
        nextSchedule: {
          anchorType: mergedDraft.anchorType,
          intervalValue: mergedDraft.intervalValue,
          recurrenceType: mergedDraft.recurrenceType,
          reminderTimeLocal: mergedDraft.reminderTimeLocal,
          weekdayMask: mergedDraft.weekdayMask,
        },
        timezone,
      }) ?? item.startDateLocal)
    : null;

  return {
    effectiveFromUtc,
    hasAnyChanges,
    mergedDraft,
    metaChanged,
    ruleChanged,
    seedStartDateLocal,
  };
}
