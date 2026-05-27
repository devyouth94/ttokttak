import type {
  CompletionLog,
  RecurringItem,
  RecurringItemColorKey,
} from "~/entities/schedule";
import {
  formatUtcTimeInTimezone,
  getNextItemOccurrenceEntries,
  getRecurrenceLabel,
} from "~/entities/schedule";
import type { AppLanguage } from "~/shared/i18n";

export type ScheduleListEntry = {
  colorKey: RecurringItemColorKey;
  id: string;
  item: RecurringItem;
  nextOccurrenceTimeLabel: string;
  nextScheduledAtUtc: string | null;
  recurrenceLabel: string;
  title: string;
};

export type ScheduleListSortMode = "createdDesc" | "titleAsc";

export const DEFAULT_SCHEDULE_LIST_SORT_MODE: ScheduleListSortMode = "titleAsc";

const noNextOccurrenceLabelByLanguage = {
  en: "No upcoming time",
  ko: "예정 없음",
} as const satisfies Record<AppLanguage, string>;

export function buildScheduleListEntries({
  completionLogs,
  items,
  language,
  now,
  sortMode = DEFAULT_SCHEDULE_LIST_SORT_MODE,
  timezone,
}: {
  completionLogs: CompletionLog[];
  items: RecurringItem[];
  language: AppLanguage;
  now: Date;
  sortMode?: ScheduleListSortMode;
  timezone: string;
}): ScheduleListEntry[] {
  return getNextItemOccurrenceEntries({
    completionLogs,
    items,
    now,
    timezone,
  })
    .map(({ item, occurrence }) => ({
      colorKey: item.colorKey,
      id: item.id,
      item,
      nextOccurrenceTimeLabel: occurrence
        ? formatScheduleListNextOccurrenceTimeLabel(
            occurrence.scheduledAtUtc,
            timezone,
            language
          )
        : getNoNextOccurrenceLabel(language),
      nextScheduledAtUtc: occurrence?.scheduledAtUtc ?? null,
      recurrenceLabel: getRecurrenceLabel(item, language),
      title: item.title,
    }))
    .sort((left, right) =>
      compareScheduleListEntries(left, right, sortMode, language)
    );
}

export function formatScheduleListNextOccurrenceTimeLabel(
  scheduledAtUtc: string,
  timezone: string,
  language: AppLanguage
): string {
  return formatUtcTimeInTimezone(scheduledAtUtc, timezone, language);
}

function getNoNextOccurrenceLabel(language: AppLanguage): string {
  return noNextOccurrenceLabelByLanguage[language];
}

function compareScheduleListEntries(
  left: ScheduleListEntry,
  right: ScheduleListEntry,
  sortMode: ScheduleListSortMode,
  language: AppLanguage
): number {
  return sortMode === "createdDesc"
    ? compareByCreatedAtDesc(left, right, language)
    : compareByTitleAsc(left, right, language);
}

function compareByCreatedAtDesc(
  left: ScheduleListEntry,
  right: ScheduleListEntry,
  language: AppLanguage
): number {
  return (
    right.item.createdAt.localeCompare(left.item.createdAt) ||
    compareByTitleAsc(left, right, language)
  );
}

function compareByTitleAsc(
  left: ScheduleListEntry,
  right: ScheduleListEntry,
  language: AppLanguage
): number {
  return (
    left.title.localeCompare(right.title, language) ||
    compareByCreatedAtDescOnly(left, right)
  );
}

function compareByCreatedAtDescOnly(
  left: ScheduleListEntry,
  right: ScheduleListEntry
): number {
  return right.item.createdAt.localeCompare(left.item.createdAt);
}
