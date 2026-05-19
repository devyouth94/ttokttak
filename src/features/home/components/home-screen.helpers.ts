import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  parse,
} from "date-fns";
import { ko } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import { getOccurrenceIdentity } from "~/features/recurring/domain/occurrence";
import {
  getLatestOverdueItemOccurrenceEntries,
  getScheduledItemOccurrenceEntriesInRange,
  type LocalDateUtcRange,
} from "~/features/recurring/domain/occurrence-projection";
import {
  getOccurrenceProjectionRequirement,
  type HomeFeedOccurrenceProjectionRequirement,
} from "~/features/recurring/domain/occurrence-projection-requirement";
import type {
  CompletionLog,
  DerivedOccurrence,
  RecurringItem,
} from "~/features/recurring/domain/types";
import { getCurrentScheduleVersion } from "~/features/recurring/domain/types";
import {
  formatLocalDateTitle,
  formatLocalTimeLabel,
  getRecurrenceLabel,
} from "~/features/recurring/utils/recurring-display";
import type { ProfileRow } from "~/lib/database.types";

export const HOME_DATE_RANGE_DAYS = 15;

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
  now: Date;
  projection?: HomeFeedOccurrenceProjectionRequirement["projection"];
  selectedDateId: string;
  timezone: string;
};

type BuildSectionCardsOptions = {
  completionLogs: CompletionLog[];
  items: RecurringItem[];
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

export function getProfileName(profile: ProfileRow | null): string {
  return profile?.display_name?.trim() || "사용자";
}

export function createHomeDateOptions(today: Date): HomeDateOption[] {
  return Array.from({ length: HOME_DATE_RANGE_DAYS }, (_, index) => {
    const date = addDays(today, index);
    const id = format(date, "yyyy-MM-dd");

    return {
      dayLabel: format(date, "EEE", { locale: ko }),
      id,
      isToday: index === 0,
      title: isSameDay(date, today)
        ? "오늘"
        : format(date, "M월 d일", { locale: ko }),
      value: format(date, "d"),
    };
  });
}

export function buildHomeFeedSections({
  completionLogs,
  items,
  now,
  projection,
  selectedDateId,
  timezone,
}: BuildHomeFeedSectionsOptions): HomeFeedSection[] {
  const todayLocalDate = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const selectedDateTitle = getSelectedDateTitle(
    selectedDateId,
    todayLocalDate
  );
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
      emptyMessage: "지난 일정은 없어요",
      id: "overdue",
      items: buildOverdueCards({
        completionLogs,
        items,
        now,
        overdueLookbackStartLocalDate:
          projectionRequirement.overdueLookbackStartLocalDate,
        timezone,
        todayLocalDate,
      }),
      title: "지난 일정",
    },
    selectedSection,
    {
      caption: "홈에서는 앞으로 14일간의 일정만 보여요",
      emptyMessage: "다가오는 일정은 없어요",
      id: "upcoming",
      items: buildUpcomingCards({
        completionLogs,
        items,
        now,
        upcomingRange: projectionRequirement.upcomingRange ?? undefined,
        timezone,
        todayLocalDate,
      }),
      title: "다가오는 일정",
    },
  ];
}

function buildSelectedDateSection({
  completionLogs,
  items,
  now,
  selectedDateTitle,
  selectedRange,
  timezone,
  todayLocalDate,
}: BuildSelectedDateSectionOptions): HomeFeedSection {
  return {
    emptyMessage:
      selectedDateTitle === "오늘"
        ? "오늘은 비어 있어요"
        : `${selectedDateTitle}은 비어 있어요`,
    id: "selected-date",
    items: buildScheduledCards({
      completionLogs,
      items,
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
      toHomeFeedCard(item, occurrence, "overdue", todayLocalDate)
    )
    .sort(compareByScheduledAtUtcDesc);
}

function buildUpcomingCards({
  completionLogs,
  items,
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
      toHomeFeedCard(item, occurrence, sectionId, todayLocalDate)
    )
    .sort(compareByScheduledAtUtcAsc);
}

function getSelectedDateTitle(
  selectedDateId: string,
  todayLocalDate: string
): string {
  if (selectedDateId === todayLocalDate) {
    return "오늘";
  }

  return formatLocalDateTitle(selectedDateId);
}

function toHomeFeedCard(
  item: RecurringItem,
  occurrence: DerivedOccurrence,
  sectionId: HomeFeedSection["id"],
  todayLocalDate: string
): HomeFeedCard {
  const reminderTimeLocal = getReminderTimeLocal(item);
  const timeLabel = formatLocalTimeLabel(reminderTimeLocal);

  return {
    dateSeparatorLabel: getDateSeparatorLabel(
      sectionId,
      occurrence,
      todayLocalDate
    ),
    id: getOccurrenceIdentity(item.id, occurrence.scheduledAtUtc),
    item,
    metaLabel: getMetaLabel(sectionId, occurrence, todayLocalDate, timeLabel),
    occurrence,
    recurrenceLabel: getRecurrenceLabel(item),
    sectionId,
    timeLabel: sectionId === "overdue" ? timeLabel : null,
  };
}

function getMetaLabel(
  sectionId: HomeFeedSection["id"],
  occurrence: DerivedOccurrence,
  todayLocalDate: string,
  timeLabel: string
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

  return overdueDays === 0 ? "오늘 지남" : `${overdueDays}일 지남`;
}

function getDateSeparatorLabel(
  sectionId: HomeFeedSection["id"],
  occurrence: DerivedOccurrence,
  todayLocalDate: string
): string | null {
  if (sectionId !== "upcoming") {
    return null;
  }

  const dayDiff = differenceInCalendarDays(
    parse(occurrence.localDate, "yyyy-MM-dd", new Date()),
    parse(todayLocalDate, "yyyy-MM-dd", new Date())
  );

  return dayDiff === 1 ? "내일" : formatLocalDateTitle(occurrence.localDate);
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
