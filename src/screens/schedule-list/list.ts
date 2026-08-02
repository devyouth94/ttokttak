import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { addDays, format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { type AppLanguage, normalizeAppLanguage } from "~/i18n/app-language";
import type { ColorKey } from "~/schedule/display/color";
import { formatTimestamp } from "~/schedule/display/date";
import { getRecurrenceLabel } from "~/schedule/display/label";
import { useNow } from "~/schedule/now";
import { useScheduleRange } from "~/schedule/query";
import type { Occurrence } from "~/schedule/rules/occurrence";
import { createOccurrences } from "~/schedule/rules/occurrence";
import type { Schedule } from "~/schedule/schedule";
import { useSession } from "~/session/provider";

type Row = {
  colorKey: ColorKey;
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

const lookbackDays = 730;

export function useItems(sort: Sort) {
  const { i18n } = useTranslation();
  const language = normalizeAppLanguage(i18n.resolvedLanguage ?? i18n.language);
  const { profile } = useSession();
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = useNow();
  const today = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const query = useScheduleRange({
    endLocalDate: today,
    startLocalDate: format(
      addDays(parse(today, "yyyy-MM-dd", new Date()), -lookbackDays),
      "yyyy-MM-dd"
    ),
  });
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

  return {
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
      colorKey: schedule.colorKey,
      id: schedule.id,
      nextOccurrenceTimeLabel: occurrence
        ? formatTimestamp(occurrence.scheduledAtUtc, timezone, "time", language)
        : noNextOccurrenceLabelByLanguage[language],
      nextScheduledAtUtc: occurrence?.scheduledAtUtc ?? null,
      recurrenceLabel: getRecurrenceLabel(schedule, language),
      title: schedule.title,
    }));
}
