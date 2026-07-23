import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  parse,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { formatLocal } from "~/schedule/display/date";
import { getRecurrenceLabel } from "~/schedule/display/label";
import type { Occurrence, OccurrenceEntry } from "~/schedule/rules/occurrence";
import type { Schedule } from "~/schedule/schedule";
import { currentRule } from "~/schedule/schedule";
import type { AppLanguage } from "~/shared/i18n";

const HOME_DATE_RANGE_DAYS = 15;

const homeFeedCopyByLanguage = {
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

export type HomeDateOption = {
  dayLabel: string;
  id: string;
  isToday: boolean;
  title: string;
  value: string;
};

export type HomeFeedCard = {
  dateSeparatorLabel: string | null;
  id: string;
  item: Schedule;
  metaLabel: string;
  occurrence: Occurrence;
  recurrenceLabel: string;
  sectionId: HomeFeedSection["id"];
  timeLabel: string | null;
};

export type HomeFeedSection = {
  caption?: string;
  emptyMessage: string;
  id: "overdue" | "selected-date" | "upcoming";
  items: HomeFeedCard[];
  title: string;
};

type BuildHomeFeedSectionsOptions = {
  language: AppLanguage;
  now: Date;
  overdueEntries: OccurrenceEntry[];
  selectedDateId: string;
  selectedDateEntries: OccurrenceEntry[];
  timezone: string;
  upcomingEntries: OccurrenceEntry[];
};

type BuildSectionCardsOptions = {
  entries: OccurrenceEntry[];
  language: AppLanguage;
  sectionId: HomeFeedSection["id"];
  todayLocalDate: string;
};

type BuildSelectedDateSectionOptions = Omit<
  BuildSectionCardsOptions,
  "sectionId"
> & {
  selectedDateTitle: string;
};

type BuildRelativeCardsOptions = Omit<BuildSectionCardsOptions, "sectionId">;

type ProfileNameSource = {
  display_name: string | null;
};

export function getProfileName(profile: ProfileNameSource | null): string {
  return profile?.display_name?.trim() || "사용자";
}

export function createHomeDateOptions(
  today: Date,
  language: AppLanguage = "ko"
): HomeDateOption[] {
  const copy = homeFeedCopyByLanguage[language];

  return Array.from({ length: HOME_DATE_RANGE_DAYS }, (_, index) => {
    const date = addDays(today, index);
    const id = format(date, "yyyy-MM-dd");

    return {
      dayLabel: formatLocal(id, "weekday", language),
      id,
      isToday: index === 0,
      title: isSameDay(date, today)
        ? copy.sections.today
        : formatLocal(id, "date", language),
      value: format(date, "d"),
    };
  });
}

export function buildHomeFeedSections({
  language,
  now,
  overdueEntries,
  selectedDateId,
  selectedDateEntries,
  timezone,
  upcomingEntries,
}: BuildHomeFeedSectionsOptions): HomeFeedSection[] {
  const todayLocalDate = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const selectedDateTitle = getSelectedDateTitle(
    selectedDateId,
    todayLocalDate,
    language
  );
  const copy = homeFeedCopyByLanguage[language];
  const selectedSection = buildSelectedDateSection({
    entries: selectedDateEntries,
    language,
    selectedDateTitle,
    todayLocalDate,
  });

  if (selectedDateId !== todayLocalDate) {
    return [selectedSection];
  }

  return [
    {
      emptyMessage: copy.empty.overdue,
      id: "overdue",
      items: buildOverdueCards({
        entries: overdueEntries,
        language,
        todayLocalDate,
      }),
      title: copy.sections.overdue,
    },
    selectedSection,
    {
      caption: copy.upcomingCaption,
      emptyMessage: copy.empty.upcoming,
      id: "upcoming",
      items: buildUpcomingCards({
        entries: upcomingEntries,
        language,
        todayLocalDate,
      }),
      title: copy.sections.upcoming,
    },
  ];
}

function buildSelectedDateSection({
  entries,
  language,
  selectedDateTitle,
  todayLocalDate,
}: BuildSelectedDateSectionOptions): HomeFeedSection {
  const copy = homeFeedCopyByLanguage[language];
  const isToday = selectedDateTitle === copy.sections.today;

  return {
    emptyMessage: copy.empty.selectedDate(selectedDateTitle, isToday),
    id: "selected-date",
    items: buildScheduledCards({
      entries,
      language,
      sectionId: "selected-date",
      todayLocalDate,
    }),
    title: selectedDateTitle,
  };
}

function buildOverdueCards({
  entries,
  language,
  todayLocalDate,
}: BuildRelativeCardsOptions): HomeFeedCard[] {
  return entries
    .map(({ schedule, occurrence }) =>
      toHomeFeedCard(schedule, occurrence, "overdue", todayLocalDate, language)
    )
    .sort(compareByScheduledAtUtcDesc);
}

function buildUpcomingCards({
  entries,
  language,
  todayLocalDate,
}: BuildRelativeCardsOptions): HomeFeedCard[] {
  return buildScheduledCards({
    entries,
    language,
    sectionId: "upcoming",
    todayLocalDate,
  });
}

function buildScheduledCards({
  entries,
  language,
  sectionId,
  todayLocalDate,
}: BuildSectionCardsOptions): HomeFeedCard[] {
  return entries
    .map(({ schedule, occurrence }) =>
      toHomeFeedCard(schedule, occurrence, sectionId, todayLocalDate, language)
    )
    .sort(compareByScheduledAtUtcAsc);
}

function getSelectedDateTitle(
  selectedDateId: string,
  todayLocalDate: string,
  language: AppLanguage
): string {
  if (selectedDateId === todayLocalDate) {
    return homeFeedCopyByLanguage[language].sections.today;
  }

  return formatLocal(selectedDateId, "date", language);
}

function toHomeFeedCard(
  item: Schedule,
  occurrence: Occurrence,
  sectionId: HomeFeedSection["id"],
  todayLocalDate: string,
  language: AppLanguage
): HomeFeedCard {
  const reminderTimeLocal = getReminderTimeLocal(item);
  const timeLabel = formatLocal(reminderTimeLocal, "time", language);

  return {
    dateSeparatorLabel: getDateSeparatorLabel(
      sectionId,
      occurrence,
      todayLocalDate,
      language
    ),
    id: `${item.id}:${occurrence.scheduledAtUtc}`,
    item,
    metaLabel: getMetaLabel(
      sectionId,
      occurrence,
      todayLocalDate,
      timeLabel,
      language
    ),
    occurrence,
    recurrenceLabel: getRecurrenceLabel(item, language),
    sectionId,
    timeLabel: sectionId === "overdue" ? timeLabel : null,
  };
}

function getMetaLabel(
  sectionId: HomeFeedSection["id"],
  occurrence: Occurrence,
  todayLocalDate: string,
  timeLabel: string,
  language: AppLanguage
): string {
  if (sectionId === "selected-date") {
    return timeLabel;
  }

  if (sectionId === "upcoming") {
    return timeLabel;
  }

  const overdueDays = differenceInCalendarDays(
    parse(todayLocalDate, "yyyy-MM-dd", new Date()),
    parse(occurrence.localDate, "yyyy-MM-dd", new Date())
  );

  const copy = homeFeedCopyByLanguage[language];

  return overdueDays === 0 ? copy.overdueToday : copy.overdueDays(overdueDays);
}

function getDateSeparatorLabel(
  sectionId: HomeFeedSection["id"],
  occurrence: Occurrence,
  todayLocalDate: string,
  language: AppLanguage
): string | null {
  if (sectionId !== "upcoming") {
    return null;
  }

  const dayDiff = differenceInCalendarDays(
    parse(occurrence.localDate, "yyyy-MM-dd", new Date()),
    parse(todayLocalDate, "yyyy-MM-dd", new Date())
  );

  return dayDiff === 1
    ? homeFeedCopyByLanguage[language].tomorrow
    : formatLocal(occurrence.localDate, "date", language);
}

function getReminderTimeLocal(item: Schedule): string {
  return currentRule(item).reminderTimeLocal;
}

function compareByScheduledAtUtcAsc(
  left: HomeFeedCard,
  right: HomeFeedCard
): number {
  return left.occurrence.scheduledAtUtc.localeCompare(
    right.occurrence.scheduledAtUtc
  );
}

function compareByScheduledAtUtcDesc(
  left: HomeFeedCard,
  right: HomeFeedCard
): number {
  return right.occurrence.scheduledAtUtc.localeCompare(
    left.occurrence.scheduledAtUtc
  );
}
