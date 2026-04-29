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
const UPCOMING_LIMIT = 10;

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
  id: string;
  item: RecurringItem;
  metaLabel: string;
  occurrence: DerivedOccurrence;
  recurrenceLabel: string;
  sectionId: HomeFeedSection["id"];
  timeLabel: string | null;
};

export type HomeFeedSection = {
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
  const selectedItems = items
    .flatMap((item) =>
      getOccurrencesInRange(
        item,
        selectedRange.startUtc,
        selectedRange.endUtc,
        timezone,
        completionLogs,
        nowUtc
      )
        .filter((occurrence) => occurrence.status === "scheduled")
        .map((occurrence) =>
          toHomeFeedCard(item, occurrence, "selected-date", todayLocalDate)
        )
    )
    .sort(compareByScheduledAtUtcAsc);

  const selectedSection: HomeFeedSection = {
    emptyMessage:
      selectedDateTitle === "오늘"
        ? "오늘은 비어 있어요"
        : `${selectedDateTitle}은 비어 있어요`,
    id: "selected-date",
    items: selectedItems,
    title: selectedDateTitle,
  };

  if (selectedDateId !== todayLocalDate) {
    return [selectedSection];
  }

  const overdueStartLocalDate = format(
    addDays(today, -OVERDUE_LOOKBACK_DAYS),
    "yyyy-MM-dd"
  );
  const overdueStartUtc = getUtcDayRange(
    overdueStartLocalDate,
    timezone
  ).startUtc;
  const overdueItems = items
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

  const upcomingStartLocalDate = format(addDays(today, 1), "yyyy-MM-dd");
  const upcomingEndLocalDate = format(
    addDays(today, UPCOMING_RANGE_DAYS),
    "yyyy-MM-dd"
  );
  const upcomingRangeStartUtc = getUtcDayRange(
    upcomingStartLocalDate,
    timezone
  ).startUtc;
  const upcomingRangeEndUtc = getUtcDayRange(
    upcomingEndLocalDate,
    timezone
  ).endUtc;
  const upcomingItems = items
    .flatMap((item) =>
      getOccurrencesInRange(
        item,
        upcomingRangeStartUtc,
        upcomingRangeEndUtc,
        timezone,
        completionLogs,
        nowUtc
      )
        .filter((occurrence) => occurrence.status === "scheduled")
        .map((occurrence) =>
          toHomeFeedCard(item, occurrence, "upcoming", todayLocalDate)
        )
    )
    .sort(compareByScheduledAtUtcAsc)
    .slice(0, UPCOMING_LIMIT);

  return [
    {
      emptyMessage: "놓친 일정은 없어요",
      id: "overdue",
      items: overdueItems,
      title: "놓친 일정",
    },
    selectedSection,
    {
      emptyMessage: "다가오는 일정은 없어요",
      id: "upcoming",
      items: upcomingItems,
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

function getSelectedDateTitle(selectedDateId: string, today: Date): string {
  const selectedDate = parse(selectedDateId, "yyyy-MM-dd", new Date());

  if (isSameDay(selectedDate, today)) {
    return "오늘";
  }

  return formatLocalDateTitle(selectedDateId);
}

function getUtcDayRange(
  localDate: string,
  timezone: string
): { endUtc: string; startUtc: string } {
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
  const currentSchedule = getCurrentScheduleVersion(item);
  const reminderTimeLocal =
    currentSchedule?.reminderTimeLocal ?? item.reminderTimeLocal;

  return {
    id: getOccurrenceIdentity(item.id, occurrence.scheduledAtUtc),
    item,
    metaLabel: getMetaLabel(sectionId, item, occurrence, todayLocalDate),
    occurrence,
    recurrenceLabel: getRecurrenceLabel(item),
    sectionId,
    timeLabel:
      sectionId === "selected-date" ? null : getTimeLabel(reminderTimeLocal),
  };
}

function getMetaLabel(
  sectionId: HomeFeedSection["id"],
  item: RecurringItem,
  occurrence: DerivedOccurrence,
  todayLocalDate: string
): string {
  const currentSchedule = getCurrentScheduleVersion(item);
  const reminderTimeLocal =
    currentSchedule?.reminderTimeLocal ?? item.reminderTimeLocal;

  if (sectionId === "selected-date") {
    return getTimeLabel(reminderTimeLocal);
  }

  if (sectionId === "upcoming") {
    const daysUntil = differenceInCalendarDays(
      parse(occurrence.localDate, "yyyy-MM-dd", new Date()),
      parse(todayLocalDate, "yyyy-MM-dd", new Date())
    );

    return `${daysUntil}일 후`;
  }

  const overdueDays = differenceInCalendarDays(
    parse(todayLocalDate, "yyyy-MM-dd", new Date()),
    parse(occurrence.localDate, "yyyy-MM-dd", new Date())
  );

  return overdueDays === 0 ? "오늘 지남" : `${overdueDays}일 지남`;
}

function getTimeLabel(localTime: string): string {
  return formatLocalTimeLabel(localTime);
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
