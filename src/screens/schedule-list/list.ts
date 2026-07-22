import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useScheduleReadContext } from "~/application/schedule-read";
import type {
  ItemNextOccurrenceProjectionEntry,
  RecurringItemColorKey,
} from "~/entities/schedule";
import {
  formatUtcTimeInTimezone,
  getNextItemOccurrenceEntries,
  getRecurrenceLabel,
} from "~/entities/schedule";
import { useOccurrenceProjectionNow } from "~/features/read-schedule/model/use-occurrence-projection-now";
import { useOccurrenceProjectionQuery } from "~/features/read-schedule/model/use-occurrence-projection-query";
import {
  type AppLanguage,
  normalizeAppLanguage,
} from "~/shared/i18n/app-language";

type Row = {
  colorKey: RecurringItemColorKey;
  id: string;
  nextOccurrenceTimeLabel: string;
  nextScheduledAtUtc: string | null;
  recurrenceLabel: string;
  title: string;
};

export type Sort = "createdDesc" | "titleAsc";

const noNextOccurrenceLabelByLanguage = {
  en: "No upcoming time",
  ko: "예정 없음",
} as const satisfies Record<AppLanguage, string>;

export function useItems(sort: Sort) {
  const { i18n } = useTranslation();
  const language = normalizeAppLanguage(i18n.resolvedLanguage ?? i18n.language);
  const context = useScheduleReadContext();
  const now = useOccurrenceProjectionNow();
  const query = useOccurrenceProjectionQuery({
    context,
    purpose: { now, type: "scheduleList" },
  });
  const { completionLogs, items, timezone } = query;
  const rows = useMemo(
    () =>
      toRows({
        language,
        nextOccurrenceEntries: getNextItemOccurrenceEntries({
          completionLogs,
          items,
          now,
          timezone,
        }),
        sort,
        timezone,
      }),
    [completionLogs, items, language, now, sort, timezone]
  );
  const status = query.isLoading ? "loading" : query.error ? "error" : "ready";

  return {
    isRefreshing: query.isRefreshing,
    refetch: query.refetch,
    rows,
    status,
  };
}

function toRows({
  language,
  nextOccurrenceEntries,
  sort = "titleAsc",
  timezone,
}: {
  language: AppLanguage;
  nextOccurrenceEntries: ItemNextOccurrenceProjectionEntry[];
  sort?: Sort;
  timezone: string;
}): Row[] {
  return [...nextOccurrenceEntries]
    .sort((left, right) => {
      const byCreatedAt = right.item.createdAt.localeCompare(
        left.item.createdAt
      );
      const byTitle = left.item.title.localeCompare(right.item.title, language);

      return sort === "createdDesc"
        ? byCreatedAt || byTitle
        : byTitle || byCreatedAt;
    })
    .map(({ item, occurrence }) => ({
      colorKey: item.colorKey,
      id: item.id,
      nextOccurrenceTimeLabel: occurrence
        ? formatUtcTimeInTimezone(occurrence.scheduledAtUtc, timezone, language)
        : noNextOccurrenceLabelByLanguage[language],
      nextScheduledAtUtc: occurrence?.scheduledAtUtc ?? null,
      recurrenceLabel: getRecurrenceLabel(item, language),
      title: item.title,
    }));
}
