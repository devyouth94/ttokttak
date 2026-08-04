import { addDays, differenceInCalendarDays, format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import type { AppLanguage } from "~/i18n/language";
import { formatLocal } from "~/schedule/display/date";
import { getRecurrenceLabel } from "~/schedule/display/label";
import {
  createOccurrences,
  type Occurrence,
  type OccurrenceEntry,
  type OccurrenceLog,
  toUtcRange,
} from "~/schedule/rules/occurrence";
import type { Schedule } from "~/schedule/schedule";
import { currentRule } from "~/schedule/schedule";

const OVERDUE_LOOKBACK_DAYS = 730;
const UPCOMING_DAYS = 14;

const copyByLanguage = {
  en: {
    empty: {
      overdue: "No overdue items",
      selectedDate: (title: string, isToday: boolean) =>
        isToday
          ? "Nothing scheduled for today"
          : `Nothing scheduled for ${title}`,
      upcoming: "No upcoming items",
    },
    overdueToday: "Overdue today",
    overdueDays: (days: number) => `${days} days overdue`,
    sections: {
      overdue: "Overdue",
      today: "Today",
      upcoming: "Upcoming",
    },
    tomorrow: "Tomorrow",
    upcomingCaption: "Home shows items for the next 14 days",
  },
  ko: {
    empty: {
      overdue: "지난 일정은 없어요",
      selectedDate: (title: string, isToday: boolean) =>
        isToday ? "오늘은 비어 있어요" : `${title}은 비어 있어요`,
      upcoming: "다가오는 일정은 없어요",
    },
    overdueToday: "오늘 지남",
    overdueDays: (days: number) => `${days}일 지남`,
    sections: {
      overdue: "지난 일정",
      today: "오늘",
      upcoming: "다가오는 일정",
    },
    tomorrow: "내일",
    upcomingCaption: "홈에서는 앞으로 14일간의 일정만 보여요",
  },
} as const;

export type HomeFeedCard = {
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
  timezone: string;
};

type HomeSectionContext = {
  dates: ReturnType<typeof getHomeDates>;
  language: AppLanguage;
  occurrences: ReturnType<typeof createOccurrences>;
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
  timezone,
}: HomeSectionsInput): HomeFeedSection[] {
  const dates = getHomeDates(now, selectedDateId, timezone);
  const occurrences = createOccurrences({ logs, now, schedules, timezone });
  const context = { dates, language, occurrences, timezone };

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
    overdueStart: addLocalDays(today, -OVERDUE_LOOKBACK_DAYS),
    today,
    upcomingEnd: addLocalDays(today, UPCOMING_DAYS),
    upcomingStart: addLocalDays(today, 1),
  };
}

function addLocalDays(localDate: string, amount: number): string {
  return format(
    addDays(parse(localDate, "yyyy-MM-dd", new Date()), amount),
    "yyyy-MM-dd"
  );
}

function createOverdueSection(
  context: HomeSectionContext,
  now: Date
): HomeFeedSection {
  const { dates, language, occurrences, timezone } = context;
  const copy = copyByLanguage[language];
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
    emptyMessage: copy.empty.overdue,
    id: "overdue",
    items: createCards(entries, "overdue", dates.today, language, "desc"),
    title: copy.sections.overdue,
  };
}

function createSelectedDateSection(
  context: HomeSectionContext,
  selectedDateId: string
): HomeFeedSection {
  const { dates, language, occurrences, timezone } = context;
  const copy = copyByLanguage[language];
  const isToday = selectedDateId === dates.today;
  const title = isToday
    ? copy.sections.today
    : formatLocal(selectedDateId, "date", language);
  const entries = occurrences.range(
    toUtcRange(selectedDateId, timezone),
    "scheduled"
  );

  return {
    emptyMessage: copy.empty.selectedDate(title, isToday),
    id: "selected-date",
    items: createCards(entries, "selected-date", dates.today, language),
    title,
  };
}

function createUpcomingSection(context: HomeSectionContext): HomeFeedSection {
  const { dates, language, occurrences, timezone } = context;
  const copy = copyByLanguage[language];
  const entries = occurrences.range(
    {
      endUtc: toUtcRange(dates.upcomingEnd, timezone).endUtc,
      startUtc: toUtcRange(dates.upcomingStart, timezone).startUtc,
    },
    "scheduled"
  );

  return {
    caption: copy.upcomingCaption,
    emptyMessage: copy.empty.upcoming,
    id: "upcoming",
    items: createCards(entries, "upcoming", dates.today, language),
    title: copy.sections.upcoming,
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
  order: "asc" | "desc" = "asc"
): HomeFeedCard[] {
  return entries
    .map(({ schedule, occurrence }) =>
      createCard(schedule, occurrence, sectionId, today, language)
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
  language: AppLanguage
): HomeFeedCard {
  const timeLabel = formatLocal(
    currentRule(item).reminderTimeLocal,
    "time",
    language
  );
  const recurrenceLabel = getRecurrenceLabel(item, language);
  const metaLine =
    sectionId === "overdue"
      ? [
          getOverdueLabel(occurrence, today, language),
          timeLabel,
          recurrenceLabel,
        ].join(" · ")
      : [timeLabel, recurrenceLabel].join(" · ");

  return {
    dateSeparatorLabel:
      sectionId === "upcoming"
        ? getUpcomingDateLabel(occurrence, today, language)
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
  language: AppLanguage
): string {
  const overdueDays = differenceInCalendarDays(
    parse(today, "yyyy-MM-dd", new Date()),
    parse(occurrence.localDate, "yyyy-MM-dd", new Date())
  );
  const copy = copyByLanguage[language];

  return overdueDays === 0 ? copy.overdueToday : copy.overdueDays(overdueDays);
}

function getUpcomingDateLabel(
  occurrence: Occurrence,
  today: string,
  language: AppLanguage
): string {
  const dayDiff = differenceInCalendarDays(
    parse(occurrence.localDate, "yyyy-MM-dd", new Date()),
    parse(today, "yyyy-MM-dd", new Date())
  );

  return dayDiff === 1
    ? copyByLanguage[language].tomorrow
    : formatLocal(occurrence.localDate, "date", language);
}
