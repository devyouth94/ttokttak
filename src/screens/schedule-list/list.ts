import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { type AppLanguage, normalizeAppLanguage } from "~/i18n/language";
import { formatTimestamp } from "~/schedule/display/date";
import { getRecurrenceLabel } from "~/schedule/display/label";
import { useNow } from "~/schedule/now";
import { useSchedules } from "~/schedule/query";
import type { Occurrence } from "~/schedule/rules/occurrence";
import { createOccurrences } from "~/schedule/rules/occurrence";
import { getScheduleDisplayTitle, type Schedule } from "~/schedule/schedule";

type Row = {
  colorHex: string;
  id: string;
  nextOccurrenceTimeLabel: string;
  nextScheduledAtUtc: string | null;
  recurrenceLabel: string;
  title: string;
};

export type Sort = "createdDesc" | "titleAsc";

export function useScheduleList() {
  const { i18n, t } = useTranslation();
  const now = useNow();
  const query = useSchedules();

  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<Sort>("titleAsc");

  const language = normalizeAppLanguage(i18n.resolvedLanguage ?? i18n.language);
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
      noNextOccurrenceLabel: t("scheduleList.noUpcomingTime"),
      sort,
      timezone: queryTimezone,
      unavailableTitle: t("schedule.contentUnavailableTitle"),
    });
  }, [items, language, logs, now, queryTimezone, sort, t]);

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
  noNextOccurrenceLabel,
  sort = "titleAsc",
  timezone,
  unavailableTitle,
}: {
  language: AppLanguage;
  nextOccurrenceEntries: {
    occurrence: Occurrence | null;
    schedule: Schedule;
  }[];
  noNextOccurrenceLabel: string;
  sort?: Sort;
  timezone: string;
  unavailableTitle: string;
}): Row[] {
  return [...nextOccurrenceEntries]
    .sort((left, right) => {
      const byCreatedAt = right.schedule.createdAt.localeCompare(
        left.schedule.createdAt
      );
      const byTitle = getScheduleDisplayTitle(
        left.schedule,
        unavailableTitle
      ).localeCompare(
        getScheduleDisplayTitle(right.schedule, unavailableTitle),
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
        : noNextOccurrenceLabel,
      nextScheduledAtUtc: occurrence?.scheduledAtUtc ?? null,
      recurrenceLabel: getRecurrenceLabel(schedule, language),
      title: getScheduleDisplayTitle(schedule, unavailableTitle),
    }));
}
