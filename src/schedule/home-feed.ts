import { differenceInCalendarDays } from "date-fns/differenceInCalendarDays";
import { parse } from "date-fns/parse";
import { formatInTimeZone } from "date-fns-tz";
import type { TFunction } from "i18next";

import type { AppLanguage } from "~/i18n/language";
import { formatLocal } from "~/schedule/display/date";
import { getRecurrenceLabel } from "~/schedule/display/label";
import {
  addLocalDays,
  createOccurrences,
  type Occurrence,
  OCCURRENCE_LOOKBACK_DAYS,
  type OccurrenceEntry,
  type OccurrenceLog,
  toUtcRange,
} from "~/schedule/rules/occurrence";
import type { Schedule } from "~/schedule/schedule";
import { currentRule } from "~/schedule/schedule";

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

type HomeSectionContext = {
  dates: ReturnType<typeof getHomeDates>;
  language: AppLanguage;
  occurrences: ReturnType<typeof createOccurrences>;
  t: TFunction;
  timezone: string;
};

/** 선택 날짜에 필요한 occurrence 조회 범위를 계산한다. */
export function getHomeQueryRange({
  now,
  selectedDateId,
  timezone,
}: Pick<HomeSectionsInput, "now" | "selectedDateId" | "timezone">): {
  endLocalDate: string;
  startLocalDate: string;
} {
  const dates = getHomeDates(now, selectedDateId, timezone);

  return {
    endLocalDate: dates.isToday ? dates.upcomingEnd : selectedDateId,
    startLocalDate: dates.isToday ? dates.overdueStart : selectedDateId,
  };
}

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
  const context = { dates, language, occurrences, t, timezone };

  if (!dates.isToday) {
    return [createSelectedDateSection(context, selectedDateId)];
  }

  return [
    createOverdueSection(context, now),
    createSelectedDateSection(context, selectedDateId),
    createUpcomingSection(context),
  ];
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

function createOverdueSection(
  context: HomeSectionContext,
  now: Date
): HomeFeedSection {
  const { dates, language, occurrences, t, timezone } = context;
  const entries = keepLatestOverdueBySchedule(
    occurrences.range(
      {
        endUtc: now.toISOString(),
        startUtc: toUtcRange(dates.overdueStart, timezone).startUtc,
      },
      "overdue"
    )
  );

  return {
    emptyMessage: t("home.feed.emptyOverdue"),
    id: "overdue",
    items: createCards(entries, "overdue", dates.today, language, t, "desc"),
    title: t("home.feed.sectionOverdue"),
  };
}

function createSelectedDateSection(
  context: HomeSectionContext,
  selectedDateId: string
): HomeFeedSection {
  const { dates, language, occurrences, t, timezone } = context;
  const isToday = selectedDateId === dates.today;
  const title = isToday
    ? t("home.feed.sectionToday")
    : formatLocal(selectedDateId, "date", language);
  const entries = occurrences.range(
    toUtcRange(selectedDateId, timezone),
    "scheduled"
  );

  return {
    emptyMessage: isToday
      ? t("home.feed.emptyToday")
      : t("home.feed.emptySelectedDate", { date: title }),
    id: "selected-date",
    items: createCards(entries, "selected-date", dates.today, language, t),
    title,
  };
}

function createUpcomingSection(context: HomeSectionContext): HomeFeedSection {
  const { dates, language, occurrences, t, timezone } = context;
  const entries = occurrences.range(
    {
      endUtc: toUtcRange(dates.upcomingEnd, timezone).endUtc,
      startUtc: toUtcRange(dates.upcomingStart, timezone).startUtc,
    },
    "scheduled"
  );

  return {
    caption: t("home.feed.upcomingCaption"),
    emptyMessage: t("home.feed.emptyUpcoming"),
    id: "upcoming",
    items: createCards(entries, "upcoming", dates.today, language, t),
    title: t("home.feed.sectionUpcoming"),
  };
}

/**
 * 같은 일정에서 여러 occurrence가 밀려도 홈에는 가장 최근 하나만 보여준다.
 * 사용자가 이 항목을 처리하면 action module이 이전 미처리 occurrence까지 처리한다.
 */
function keepLatestOverdueBySchedule(
  entries: OccurrenceEntry[]
): OccurrenceEntry[] {
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

function createCards(
  entries: OccurrenceEntry[],
  sectionId: HomeFeedSection["id"],
  today: string,
  language: AppLanguage,
  t: TFunction,
  order: "asc" | "desc" = "asc"
): HomeFeedCard[] {
  return entries
    .map(({ schedule, occurrence }) =>
      createCard(schedule, occurrence, sectionId, today, language, t)
    )
    .sort((left, right) =>
      order === "asc"
        ? left.occurrence.scheduledAtUtc.localeCompare(
            right.occurrence.scheduledAtUtc
          )
        : right.occurrence.scheduledAtUtc.localeCompare(
            left.occurrence.scheduledAtUtc
          )
    );
}

function createCard(
  item: Schedule,
  occurrence: Occurrence,
  sectionId: HomeFeedSection["id"],
  today: string,
  language: AppLanguage,
  t: TFunction
): HomeFeedCard {
  const timeLabel = formatLocal(
    currentRule(item).reminderTimeLocal,
    "time",
    language
  );
  const recurrenceLabel = getRecurrenceLabel(item, language);
  const overdueLabel =
    sectionId === "overdue" ? getOverdueLabel(occurrence, today, t) : null;
  const metaLine = overdueLabel
    ? [overdueLabel, timeLabel, recurrenceLabel].join(" · ")
    : [timeLabel, recurrenceLabel].join(" · ");

  return {
    compactMetaLine: overdueLabel
      ? [overdueLabel, timeLabel].join(" · ")
      : timeLabel,
    dateSeparatorLabel:
      sectionId === "upcoming"
        ? getUpcomingDateLabel(occurrence, today, language, t)
        : null,
    id: `${item.id}:${occurrence.scheduledAtUtc}`,
    item,
    metaLine,
    occurrence,
  };
}

function getOverdueLabel(
  occurrence: Occurrence,
  today: string,
  t: TFunction
): string {
  const overdueDays = differenceInCalendarDays(
    parse(today, "yyyy-MM-dd", new Date()),
    parse(occurrence.localDate, "yyyy-MM-dd", new Date())
  );
  return overdueDays === 0
    ? t("home.feed.overdueToday")
    : t("home.feed.overdueDays", { count: overdueDays });
}

function getUpcomingDateLabel(
  occurrence: Occurrence,
  today: string,
  language: AppLanguage,
  t: TFunction
): string {
  const dayDiff = differenceInCalendarDays(
    parse(occurrence.localDate, "yyyy-MM-dd", new Date()),
    parse(today, "yyyy-MM-dd", new Date())
  );

  return dayDiff === 1
    ? t("home.feed.tomorrow")
    : formatLocal(occurrence.localDate, "date", language);
}
