import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  parse,
  startOfDay,
} from "date-fns";
import { ko } from "date-fns/locale";
import { fromZonedTime } from "date-fns-tz";

import {
  getOccurrenceIdentity,
  getOccurrencesInRange,
} from "~/features/recurring/domain/occurrence";
import { getOccurrencesToResolve } from "~/features/recurring/domain/occurrence-actions";
import type {
  CompletionLog,
  DerivedOccurrence,
  RecurringItem,
} from "~/features/recurring/domain/types";
import { getCurrentScheduleVersion } from "~/features/recurring/domain/types";
import {
  formatLocalDateTitle,
  formatLocalTimeLabel,
} from "~/features/recurring/utils/recurring-display";
import type { ProfileRow } from "~/lib/database.types";

export const HOME_DATE_RANGE_DAYS = 15;

const OVERDUE_LOOKBACK_DAYS = 730;
const UPCOMING_RANGE_DAYS = 14;

const weekdayLabelByValue = new Map<number, string>([
  [0, "일"],
  [1, "월"],
  [2, "화"],
  [3, "수"],
  [4, "목"],
  [5, "금"],
  [6, "토"],
]);

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
  selectedDateId: string;
  timezone: string;
};

type UtcDayRange = {
  endUtc: string;
  startUtc: string;
};

type BuildSectionCardsOptions = {
  completionLogs: CompletionLog[];
  items: RecurringItem[];
  nowUtc: string;
  range: UtcDayRange;
  sectionId: HomeFeedSection["id"];
  timezone: string;
  todayLocalDate: string;
};

type BuildSelectedDateSectionOptions = Omit<
  BuildSectionCardsOptions,
  "range" | "sectionId"
> & {
  selectedDateTitle: string;
  selectedRange: UtcDayRange;
};

type BuildRelativeCardsOptions = Omit<
  BuildSectionCardsOptions,
  "range" | "sectionId"
> & {
  today: Date;
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
  selectedDateId,
  timezone,
}: BuildHomeFeedSectionsOptions): HomeFeedSection[] {
  const today = startOfDay(now);
  const todayLocalDate = format(today, "yyyy-MM-dd");
  const selectedDateTitle = getSelectedDateTitle(selectedDateId, today);
  const nowUtc = now.toISOString();
  const selectedRange = getUtcDayRange(selectedDateId, timezone);
  const selectedSection = buildSelectedDateSection({
    completionLogs,
    items,
    nowUtc,
    selectedDateTitle,
    selectedRange,
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
        nowUtc,
        today,
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
        nowUtc,
        today,
        timezone,
        todayLocalDate,
      }),
      title: "다가오는 일정",
    },
  ];
}

export function getOverdueOccurrencesToResolve({
  card,
  completionLogs,
  now,
  timezone,
}: {
  card: HomeFeedCard;
  completionLogs: CompletionLog[];
  now: Date;
  timezone: string;
}): DerivedOccurrence[] {
  return getOccurrencesToResolve({
    completionLogs,
    item: card.item,
    now,
    primaryOccurrence: card.occurrence,
    timezone,
  });
}

function buildSelectedDateSection({
  completionLogs,
  items,
  nowUtc,
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
      nowUtc,
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
  nowUtc,
  today,
  timezone,
  todayLocalDate,
}: BuildRelativeCardsOptions): HomeFeedCard[] {
  const overdueStartLocalDate = format(
    addDays(today, -OVERDUE_LOOKBACK_DAYS),
    "yyyy-MM-dd"
  );
  const overdueStartUtc = getUtcDayRange(
    overdueStartLocalDate,
    timezone
  ).startUtc;

  return items
    .flatMap((item) => {
      const latestOverdueOccurrence = getOccurrencesInRange(
        item,
        overdueStartUtc,
        nowUtc,
        timezone,
        completionLogs,
        nowUtc
      )
        .filter((occurrence) => occurrence.status === "overdue")
        .sort(compareOccurrenceByScheduledAtUtcDesc)[0];

      return latestOverdueOccurrence
        ? [
            toHomeFeedCard(
              item,
              latestOverdueOccurrence,
              "overdue",
              todayLocalDate
            ),
          ]
        : [];
    })
    .sort(compareByScheduledAtUtcDesc);
}

function buildUpcomingCards({
  completionLogs,
  items,
  nowUtc,
  today,
  timezone,
  todayLocalDate,
}: BuildRelativeCardsOptions): HomeFeedCard[] {
  const upcomingStartLocalDate = format(addDays(today, 1), "yyyy-MM-dd");
  const upcomingEndLocalDate = format(
    addDays(today, UPCOMING_RANGE_DAYS),
    "yyyy-MM-dd"
  );

  return buildScheduledCards({
    completionLogs,
    items,
    nowUtc,
    range: {
      endUtc: getUtcDayRange(upcomingEndLocalDate, timezone).endUtc,
      startUtc: getUtcDayRange(upcomingStartLocalDate, timezone).startUtc,
    },
    sectionId: "upcoming",
    timezone,
    todayLocalDate,
  });
}

function buildScheduledCards({
  completionLogs,
  items,
  nowUtc,
  range,
  sectionId,
  timezone,
  todayLocalDate,
}: BuildSectionCardsOptions): HomeFeedCard[] {
  return items
    .flatMap((item) =>
      getOccurrencesInRange(
        item,
        range.startUtc,
        range.endUtc,
        timezone,
        completionLogs,
        nowUtc
      )
        .filter((occurrence) => occurrence.status === "scheduled")
        .map((occurrence) =>
          toHomeFeedCard(item, occurrence, sectionId, todayLocalDate)
        )
    )
    .sort(compareByScheduledAtUtcAsc);
}

function getSelectedDateTitle(selectedDateId: string, today: Date): string {
  const selectedDate = parse(selectedDateId, "yyyy-MM-dd", new Date());

  if (isSameDay(selectedDate, today)) {
    return "오늘";
  }

  return formatLocalDateTitle(selectedDateId);
}

function getUtcDayRange(localDate: string, timezone: string): UtcDayRange {
  return {
    endUtc: fromZonedTime(`${localDate}T23:59:59.999`, timezone).toISOString(),
    startUtc: fromZonedTime(
      `${localDate}T00:00:00.000`,
      timezone
    ).toISOString(),
  };
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

function getRecurrenceLabel(item: RecurringItem): string {
  const currentSchedule = getCurrentScheduleVersion(item);
  const recurrenceType = currentSchedule?.recurrenceType ?? item.recurrenceType;
  const intervalValue = currentSchedule?.intervalValue ?? item.intervalValue;
  const weekdayMask = currentSchedule?.weekdayMask ?? item.weekdayMask;

  switch (recurrenceType) {
    case "once":
      return "한 번";
    case "daily":
      return "매일";
    case "interval_days":
      return `${intervalValue ?? 1}일마다`;
    case "weekly":
      return getWeeklyLabel("매주", weekdayMask);
    case "interval_weeks":
      return getWeeklyLabel(`${intervalValue ?? 1}주마다`, weekdayMask);
    case "monthly":
      return "매달";
    case "interval_months":
      return `${intervalValue ?? 1}달마다`;
    case "yearly":
      return "매년";
    default:
      return "반복";
  }
}

function getWeeklyLabel(
  baseLabel: string,
  weekdayMask?: number[] | null
): string {
  if (!weekdayMask || weekdayMask.length === 0) {
    return baseLabel;
  }

  const labels = weekdayMask.map((value) => weekdayLabelByValue.get(value)!);

  return `${baseLabel} ${labels.join("·")}`;
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

function compareOccurrenceByScheduledAtUtcDesc(
  left: DerivedOccurrence,
  right: DerivedOccurrence
): number {
  return right.scheduledAtUtc.localeCompare(left.scheduledAtUtc);
}
