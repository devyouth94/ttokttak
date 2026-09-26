import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { type AppLanguage, normalizeAppLanguage } from "~/i18n/language";
import { formatTimestamp } from "~/schedule/display/date";
import { getRecurrenceLabel } from "~/schedule/display/label";
import { useNow } from "~/schedule/now";
import { useSchedules } from "~/schedule/query";
import type { Occurrence } from "~/schedule/rules/occurrence";
import { createOccurrences } from "~/schedule/rules/occurrence";
import type { Schedule } from "~/schedule/schedule";

type Row = {
  colorHex: string;
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

export function useScheduleList() {
  const { i18n } = useTranslation();
  const language = normalizeAppLanguage(i18n.resolvedLanguage ?? i18n.language);

  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<Sort>("titleAsc");

  const now = useNow();
  const query = useSchedules();
  const { items, logs, timezone: queryTimezone } = query;

  const rows = useMemo(() => {
    const occurrences = createOccurrences({
      logs,
      now,
      schedules: items,
      timezone: queryTimezone,
    });

    return toRows({
      language,
      nextOccurrenceEntries: items.map((schedule) => ({
        occurrence: occurrences.next(schedule.id),
        schedule,
      })),
      sort,
      timezone: queryTimezone,
    });
  }, [items, language, logs, now, queryTimezone, sort]);

  const status = query.isLoading ? "loading" : query.error ? "error" : "ready";

  async function refresh(): Promise<void> {
    setRefreshing(true);

    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  return {
    refresh,
    refreshing,
    retry: query.refetch,
    rows,
    setSort,
    sort,
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
  nextOccurrenceEntries: {
    occurrence: Occurrence | null;
    schedule: Schedule;
  }[];
  sort?: Sort;
  timezone: string;
}): Row[] {
  return [...nextOccurrenceEntries]
    .sort((left, right) => {
      const byCreatedAt = right.schedule.createdAt.localeCompare(
        left.schedule.createdAt
      );
      const byTitle = left.schedule.title.localeCompare(
        right.schedule.title,
        language
      );

      return sort === "createdDesc"
        ? byCreatedAt || byTitle
        : byTitle || byCreatedAt;
    })
    .map(({ schedule, occurrence }) => ({
      colorHex: schedule.colorHex,
      id: schedule.id,
      nextOccurrenceTimeLabel: occurrence
        ? formatTimestamp(occurrence.scheduledAtUtc, timezone, "time", language)
        : noNextOccurrenceLabelByLanguage[language],
      nextScheduledAtUtc: occurrence?.scheduledAtUtc ?? null,
      recurrenceLabel: getRecurrenceLabel(schedule, language),
      title: schedule.title,
    }));
}
