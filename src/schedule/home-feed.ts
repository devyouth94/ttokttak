import { differenceInCalendarDays } from "date-fns/differenceInCalendarDays";
import { parse } from "date-fns/parse";
import { formatInTimeZone } from "date-fns-tz";
import type { TFunction } from "i18next";

import type { AppLanguage } from "~/i18n/language";

import { formatLocal } from "./display/date";
import { getRecurrenceLabel } from "./display/label";
import {
  addLocalDays,
  createOccurrences,
  type Occurrence,
  OCCURRENCE_LOOKBACK_DAYS,
  type OccurrenceEntry,
  type OccurrenceLog,
  toUtcRange,
} from "./rules/occurrence";
import { currentRule, type Schedule } from "./schedule";

const UPCOMING_DAYS = 14;

export type HomeFeedCard = {
  compactMetaLine: string;
  dateSeparatorLabel: string | null;
  id: string;
  item: Schedule;
  metaLine: string;
  occurrence: Occurrence;
};

export type HomeFeedSection = {
  caption?: string;
  emptyMessage: string;
  id: "overdue" | "selected-date" | "upcoming";
  items: HomeFeedCard[];
  title: string;
};

type HomeSectionsInput = {
  language: AppLanguage;
  logs: OccurrenceLog[];
  now: Date;
  schedules: Schedule[];
  selectedDateId: string;
  t: TFunction;
  timezone: string;
};

/** 선택 날짜를 기준으로 홈에 표시할 섹션과 카드를 만든다. */
export function createHomeSections({
  language,
  logs,
  now,
  schedules,
  selectedDateId,
  t,
  timezone,
}: HomeSectionsInput): HomeFeedSection[] {
  const dates = getHomeDates(now, selectedDateId, timezone);
  const occurrences = createOccurrences({ logs, now, schedules, timezone });
  const title = dates.isToday
    ? t("home.feed.sectionToday")
    : formatLocal(selectedDateId, "date", language);

  const selectedSection: HomeFeedSection = {
    emptyMessage: dates.isToday
      ? t("home.feed.emptyToday")
      : t("home.feed.emptySelectedDate", { date: title }),
    id: "selected-date",
    items: createCards(
      getSelectedDateEntries(occurrences, selectedDateId, timezone),
      "selected-date",
      dates.today,
      language,
      t
    ),
    title,
  };

  if (!dates.isToday) {
    return [selectedSection];
  }

  const overdueSection: HomeFeedSection = {
    emptyMessage: t("home.feed.emptyOverdue"),
    id: "overdue",
    items: createCards(
      getLatestOverdueEntries(occurrences, dates.overdueStart, now, timezone),
      "overdue",
      dates.today,
      language,
      t
    ),
    title: t("home.feed.sectionOverdue"),
  };

  const upcomingSection: HomeFeedSection = {
    caption: t("home.feed.upcomingCaption"),
    emptyMessage: t("home.feed.emptyUpcoming"),
    id: "upcoming",
    items: createCards(
      getUpcomingEntries(
        occurrences,
        dates.upcomingStart,
        dates.upcomingEnd,
        timezone
      ),
      "upcoming",
      dates.today,
      language,
      t
    ),
    title: t("home.feed.sectionUpcoming"),
  };

  return [overdueSection, selectedSection, upcomingSection];
}

function getHomeDates(now: Date, selectedDateId: string, timezone: string) {
  const today = formatInTimeZone(now, timezone, "yyyy-MM-dd");

  return {
    isToday: selectedDateId === today,
    overdueStart: addLocalDays(today, -OCCURRENCE_LOOKBACK_DAYS),
    today,
    upcomingEnd: addLocalDays(today, UPCOMING_DAYS),
    upcomingStart: addLocalDays(today, 1),
  };
}

function getSelectedDateEntries(
  occurrences: ReturnType<typeof createOccurrences>,
  selectedDateId: string,
  timezone: string
): OccurrenceEntry[] {
  return occurrences.range(toUtcRange(selectedDateId, timezone), "scheduled");
}

/**
 * 같은 일정에서 여러 occurrence가 밀려도 홈에는 가장 최근 하나만 보여준다.
 * 사용자가 이 항목을 처리하면 action module이 이전 미처리 occurrence까지 처리한다.
 */
function getLatestOverdueEntries(
  occurrences: ReturnType<typeof createOccurrences>,
  overdueStart: string,
  now: Date,
  timezone: string
): OccurrenceEntry[] {
  const entries = occurrences.range(
    {
      endUtc: now.toISOString(),
      startUtc: toUtcRange(overdueStart, timezone).startUtc,
    },
    "overdue"
  );
  const latest = new Map<string, OccurrenceEntry>();

  for (const entry of entries) {
    const previous = latest.get(entry.schedule.id);

    if (
      !previous ||
      entry.occurrence.scheduledAtUtc > previous.occurrence.scheduledAtUtc
    ) {
      latest.set(entry.schedule.id, entry);
    }
  }

  return [...latest.values()];
}

function getUpcomingEntries(
  occurrences: ReturnType<typeof createOccurrences>,
  upcomingStart: string,
  upcomingEnd: string,
  timezone: string
): OccurrenceEntry[] {
  return occurrences.range(
    {
      endUtc: toUtcRange(upcomingEnd, timezone).endUtc,
      startUtc: toUtcRange(upcomingStart, timezone).startUtc,
    },
    "scheduled"
  );
}

function createCards(
  entries: OccurrenceEntry[],
  sectionId: HomeFeedSection["id"],
  today: string,
  language: AppLanguage,
  t: TFunction
): HomeFeedCard[] {
  return entries
    .map(({ schedule: item, occurrence }): HomeFeedCard => {
      const timeLabel = formatLocal(
        currentRule(item).reminderTimeLocal,
        "time",
        language
      );
      const recurrenceLabel = getRecurrenceLabel(item, language);
      const dayDiff = differenceInCalendarDays(
        parse(occurrence.localDate, "yyyy-MM-dd", new Date()),
        parse(today, "yyyy-MM-dd", new Date())
      );
      const overdueLabel =
        sectionId === "overdue"
          ? dayDiff === 0
            ? t("home.feed.overdueToday")
            : t("home.feed.overdueDays", { count: -dayDiff })
          : null;
      const dateSeparatorLabel =
        sectionId === "upcoming"
          ? dayDiff === 1
            ? t("home.feed.tomorrow")
            : formatLocal(occurrence.localDate, "date", language)
          : null;

      return {
        compactMetaLine: overdueLabel
          ? [overdueLabel, timeLabel].join(" · ")
          : timeLabel,
        dateSeparatorLabel,
        id: item.id + ":" + occurrence.scheduledAtUtc,
        item,
        metaLine: overdueLabel
          ? [overdueLabel, timeLabel, recurrenceLabel].join(" · ")
          : [timeLabel, recurrenceLabel].join(" · "),
        occurrence,
      };
    })
    .sort((left, right) =>
      sectionId === "overdue"
        ? right.occurrence.scheduledAtUtc.localeCompare(
            left.occurrence.scheduledAtUtc
          )
        : left.occurrence.scheduledAtUtc.localeCompare(
            right.occurrence.scheduledAtUtc
          )
    );
}
