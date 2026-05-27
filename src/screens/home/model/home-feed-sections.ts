import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  parse,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import type {
  CompletionLog,
  DerivedOccurrence,
  HomeFeedOccurrenceProjectionRequirement,
  LocalDateUtcRange,
  RecurringItem,
} from "~/entities/schedule";
import {
  formatLocalDateTitle,
  formatLocalTimeLabel,
  getCurrentScheduleVersion,
  getDateFnsLocale,
  getLatestOverdueItemOccurrenceEntries,
  getOccurrenceIdentity,
  getOccurrenceProjectionRequirement,
  getRecurrenceLabel,
  getScheduledItemOccurrenceEntriesInRange,
} from "~/entities/schedule";
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
  item: RecurringItem;
  metaLabel: string;
  occurrence: DerivedOccurrence;
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
  completionLogs: CompletionLog[];
  items: RecurringItem[];
  language: AppLanguage;
  now: Date;
  projection?: HomeFeedOccurrenceProjectionRequirement["projection"];
  selectedDateId: string;
  timezone: string;
};

type BuildSectionCardsOptions = {
  completionLogs: CompletionLog[];
  items: RecurringItem[];
  language: AppLanguage;
  now: Date;
  range: LocalDateUtcRange;
  sectionId: HomeFeedSection["id"];
  timezone: string;
  todayLocalDate: string;
};

type BuildSelectedDateSectionOptions = Omit<
  BuildSectionCardsOptions,
  "range" | "sectionId"
> & {
  selectedDateTitle: string;
  selectedRange: LocalDateUtcRange;
};

type BuildRelativeCardsOptions = Omit<
  BuildSectionCardsOptions,
  "range" | "sectionId"
> & {
  overdueLookbackStartLocalDate?: string;
  upcomingRange?: LocalDateUtcRange;
};

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
  const locale = getDateFnsLocale(language);
  const copy = homeFeedCopyByLanguage[language];

  return Array.from({ length: HOME_DATE_RANGE_DAYS }, (_, index) => {
    const date = addDays(today, index);
    const id = format(date, "yyyy-MM-dd");

    return {
      dayLabel: format(date, "EEE", { locale }),
      id,
      isToday: index === 0,
      title: isSameDay(date, today)
        ? copy.sections.today
        : formatLocalDateTitle(id, language),
      value: format(date, "d"),
    };
  });
}

export function buildHomeFeedSections({
  completionLogs,
  items,
  language,
  now,
  projection,
  selectedDateId,
  timezone,
}: BuildHomeFeedSectionsOptions): HomeFeedSection[] {
  const todayLocalDate = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const selectedDateTitle = getSelectedDateTitle(
    selectedDateId,
    todayLocalDate,
    language
  );
  const copy = homeFeedCopyByLanguage[language];
  const projectionRequirement =
    projection ??
    getOccurrenceProjectionRequirement({
      items,
      purpose: {
        now,
        selectedDateId,
        type: "homeFeed",
      },
      timezone,
    }).projection;
  const selectedSection = buildSelectedDateSection({
    completionLogs,
    items,
    now,
    language,
    selectedDateTitle,
    selectedRange: projectionRequirement.selectedDateRange,
    timezone,
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
        completionLogs,
        items,
        language,
        now,
        overdueLookbackStartLocalDate:
          projectionRequirement.overdueLookbackStartLocalDate,
        timezone,
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
        completionLogs,
        items,
        language,
        now,
        upcomingRange: projectionRequirement.upcomingRange ?? undefined,
        timezone,
        todayLocalDate,
      }),
      title: copy.sections.upcoming,
    },
  ];
}

function buildSelectedDateSection({
  completionLogs,
  items,
  language,
  now,
  selectedDateTitle,
  selectedRange,
  timezone,
  todayLocalDate,
}: BuildSelectedDateSectionOptions): HomeFeedSection {
  const copy = homeFeedCopyByLanguage[language];
  const isToday = selectedDateTitle === copy.sections.today;

  return {
    emptyMessage: copy.empty.selectedDate(selectedDateTitle, isToday),
    id: "selected-date",
    items: buildScheduledCards({
      completionLogs,
      items,
      language,
      now,
      range: selectedRange,
      sectionId: "selected-date",
      timezone,
      todayLocalDate,
    }),
    title: selectedDateTitle,
  };
}

function buildOverdueCards({
  completionLogs,
  items,
  language,
  now,
  overdueLookbackStartLocalDate,
  timezone,
  todayLocalDate,
}: BuildRelativeCardsOptions): HomeFeedCard[] {
  return getLatestOverdueItemOccurrenceEntries({
    completionLogs,
    items,
    lookbackStartLocalDate: overdueLookbackStartLocalDate ?? todayLocalDate,
    now,
    timezone,
  })
    .map(({ item, occurrence }) =>
      toHomeFeedCard(item, occurrence, "overdue", todayLocalDate, language)
    )
    .sort(compareByScheduledAtUtcDesc);
}

function buildUpcomingCards({
  completionLogs,
  items,
  language,
  now,
  upcomingRange,
  timezone,
  todayLocalDate,
}: BuildRelativeCardsOptions): HomeFeedCard[] {
  if (!upcomingRange) {
    return [];
  }

  return buildScheduledCards({
    completionLogs,
    items,
    language,
    now,
    range: upcomingRange,
    sectionId: "upcoming",
    timezone,
    todayLocalDate,
  });
}

function buildScheduledCards({
  completionLogs,
  items,
  language,
  now,
  range,
  sectionId,
  timezone,
  todayLocalDate,
}: BuildSectionCardsOptions): HomeFeedCard[] {
  return getScheduledItemOccurrenceEntriesInRange({
    completionLogs,
    items,
    now,
    range,
    timezone,
  })
    .map(({ item, occurrence }) =>
      toHomeFeedCard(item, occurrence, sectionId, todayLocalDate, language)
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

  return formatLocalDateTitle(selectedDateId, language);
}

function toHomeFeedCard(
  item: RecurringItem,
  occurrence: DerivedOccurrence,
  sectionId: HomeFeedSection["id"],
  todayLocalDate: string,
  language: AppLanguage
): HomeFeedCard {
  const reminderTimeLocal = getReminderTimeLocal(item);
  const timeLabel = formatLocalTimeLabel(reminderTimeLocal, language);

  return {
    dateSeparatorLabel: getDateSeparatorLabel(
      sectionId,
      occurrence,
      todayLocalDate,
      language
    ),
    id: getOccurrenceIdentity(item.id, occurrence.scheduledAtUtc),
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
  occurrence: DerivedOccurrence,
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
  occurrence: DerivedOccurrence,
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
    : formatLocalDateTitle(occurrence.localDate, language);
}

function getReminderTimeLocal(item: RecurringItem): string {
  const currentSchedule = getCurrentScheduleVersion(item);

  return currentSchedule?.reminderTimeLocal ?? item.reminderTimeLocal;
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
