import { addDays, differenceInCalendarDays, format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { getAnchorTypeDescription } from "~/features/recurring/components/recurring-item-form-screen.helpers";
import {
  getNextOccurrence,
  getOccurrencesInRange,
} from "~/features/recurring/domain/occurrence";
import type {
  CompletionLog,
  DerivedOccurrence,
  RecurringItem,
} from "~/features/recurring/domain/types";
import { getCurrentScheduleVersion } from "~/features/recurring/domain/types";
import {
  formatLocalDateTitle,
  formatLocalTimeLabel,
  formatUtcTimeInTimezone,
  getCompletionActionLabel,
} from "~/features/recurring/utils/recurring-display";

const OVERDUE_LOOKBACK_DAYS = 730;

const weekdayLabelByValue = new Map<number, string>([
  [0, "일"],
  [1, "월"],
  [2, "화"],
  [3, "수"],
  [4, "목"],
  [5, "금"],
  [6, "토"],
]);

export type ItemDetailHistoryEntry = {
  action: CompletionLog["action"];
  id: string;
  scheduledAtUtc: string;
  statusLabel: string;
  timeLabel: string;
};

export type ItemDetailMetaEntry = {
  id: string;
  infoDescription?: string;
  label: string;
  value: string;
};

export type ItemDetailStatusCard = {
  dateLabel: string;
  kind: "empty" | "overdue" | "scheduled";
  metaLabel: string;
  timeLabel: string | null;
  title: string;
};

export type ItemDetailViewModel = {
  historyPreview: ItemDetailHistoryEntry[];
  metaEntries: ItemDetailMetaEntry[];
  nextOccurrence: DerivedOccurrence | null;
  overdueOccurrences: DerivedOccurrence[];
  primaryOccurrence: DerivedOccurrence | null;
  statusCard: ItemDetailStatusCard;
  summary: {
    category: string | null;
    description: string | null;
    title: string;
  };
};

export function shouldShowOccurrenceActions({
  occurrence,
  now,
  timezone,
}: {
  occurrence: DerivedOccurrence | null;
  now: Date;
  timezone: string;
}): boolean {
  if (!occurrence) {
    return false;
  }

  if (occurrence.status === "overdue") {
    return true;
  }

  return (
    occurrence.status === "scheduled" &&
    occurrence.localDate === formatInTimeZone(now, timezone, "yyyy-MM-dd")
  );
}

export function getItemDetailBasisOccurrence({
  completionLogs,
  item,
  now,
  primaryOccurrence,
  scheduledAtUtc,
  timezone,
}: {
  completionLogs: CompletionLog[];
  item: RecurringItem;
  now: Date;
  primaryOccurrence: DerivedOccurrence | null;
  scheduledAtUtc?: string;
  timezone: string;
}): DerivedOccurrence | null {
  if (!scheduledAtUtc) {
    return primaryOccurrence;
  }

  const matchingLog = completionLogs.find(
    (log) => log.scheduledAtUtc === scheduledAtUtc
  );

  if (matchingLog) {
    return {
      itemId: item.id,
      localDate: formatInTimeZone(scheduledAtUtc, timezone, "yyyy-MM-dd"),
      localTime: formatInTimeZone(scheduledAtUtc, timezone, "HH:mm"),
      scheduledAtLocal: formatInTimeZone(
        scheduledAtUtc,
        timezone,
        "yyyy-MM-dd'T'HH:mm:ss"
      ),
      scheduledAtUtc,
      status: matchingLog.action,
    };
  }

  const rangeStartUtc = fromZonedTime(
    `${item.startDateLocal}T00:00:00.000`,
    timezone
  ).toISOString();

  return (
    getOccurrencesInRange(
      item,
      rangeStartUtc,
      scheduledAtUtc,
      timezone,
      completionLogs,
      now.toISOString()
    ).find((occurrence) => occurrence.scheduledAtUtc === scheduledAtUtc) ?? null
  );
}

export function buildRecurringItemDetailViewModel({
  completionLogs,
  item,
  now,
  timezone,
}: {
  completionLogs: CompletionLog[];
  item: RecurringItem;
  now: Date;
  timezone: string;
}): ItemDetailViewModel {
  const nowUtc = now.toISOString();
  const overdueOccurrences = getOverdueOccurrences(
    item,
    completionLogs,
    now,
    timezone
  );
  const nextOccurrence = getNextOccurrence(
    item,
    nowUtc,
    timezone,
    completionLogs
  );
  const primaryOccurrence = overdueOccurrences[0] ?? nextOccurrence;

  return {
    historyPreview: buildHistoryPreview(completionLogs, timezone),
    metaEntries: buildMetaEntries(item),
    nextOccurrence,
    overdueOccurrences,
    primaryOccurrence,
    statusCard: buildStatusCard({
      now,
      nextOccurrence,
      overdueOccurrences,
      timezone,
    }),
    summary: {
      category: item.category?.trim() || null,
      description: item.description?.trim() || null,
      title: item.title,
    },
  };
}

export function buildHistoryPreview(
  completionLogs: CompletionLog[],
  timezone: string
): ItemDetailHistoryEntry[] {
  return completionLogs
    .slice()
    .sort(compareLogsByScheduledAtUtcDesc)
    .slice(0, 3)
    .map((log) => ({
      action: log.action,
      id: log.id,
      scheduledAtUtc: log.scheduledAtUtc,
      statusLabel: getCompletionActionLabel(log.action),
      timeLabel: formatHistoryPreviewTime(log.scheduledAtUtc, timezone),
    }));
}

export function buildMetaEntries(item: RecurringItem): ItemDetailMetaEntry[] {
  const currentSchedule = getCurrentScheduleVersion(item);
  const anchorType = currentSchedule?.anchorType ?? item.anchorType;
  const notificationsEnabled =
    currentSchedule?.notificationsEnabled ?? item.notificationsEnabled;

  return [
    {
      id: "recurrence",
      label: "반복 규칙",
      value: getRecurrenceLabel(item),
    },
    {
      id: "start-date",
      label: "시작일",
      value: format(
        parse(item.startDateLocal, "yyyy-MM-dd", new Date()),
        "yyyy년 M월 d일",
        {
          locale: ko,
        }
      ),
    },
    {
      id: "anchor-type",
      infoDescription: getAnchorTypeInfoDescription(anchorType),
      label: "다음 일정 계산",
      value: anchorType === "fixed" ? "시작일 기준" : "완료일 기준",
    },
    {
      id: "notifications",
      label: "알림",
      value: notificationsEnabled ? "사용" : "중지",
    },
  ];
}

function getAnchorTypeInfoDescription(
  _anchorType: RecurringItem["anchorType"]
): string {
  return [
    `시작일 기준: ${getAnchorTypeDescription("fixed")}`,
    "",
    `완료일 기준: ${getAnchorTypeDescription("completion_based")}`,
  ].join("\n");
}

export function buildStatusCard({
  now,
  nextOccurrence,
  overdueOccurrences,
  timezone,
}: {
  now: Date;
  nextOccurrence: DerivedOccurrence | null;
  overdueOccurrences: DerivedOccurrence[];
  timezone: string;
}): ItemDetailStatusCard {
  if (overdueOccurrences.length > 0) {
    const latestOverdueOccurrence = overdueOccurrences[0];
    const overdueDays = differenceInCalendarDays(
      parse(
        formatInTimeZone(now, timezone, "yyyy-MM-dd"),
        "yyyy-MM-dd",
        new Date()
      ),
      parse(latestOverdueOccurrence.localDate, "yyyy-MM-dd", new Date())
    );

    return {
      dateLabel: formatInTimeZone(
        latestOverdueOccurrence.scheduledAtUtc,
        timezone,
        "M월 d일",
        { locale: ko }
      ),
      kind: "overdue",
      metaLabel:
        overdueOccurrences.length === 1
          ? overdueDays === 0
            ? "오늘"
            : `${overdueDays}일 지남`
          : `${overdueOccurrences.length}건 밀림`,
      timeLabel: formatUtcTimeInTimezone(
        latestOverdueOccurrence.scheduledAtUtc,
        timezone
      ),
      title: "놓친 일정",
    };
  }

  if (!nextOccurrence) {
    return {
      dateLabel: "없음",
      kind: "empty",
      metaLabel: "후속 일정 없음",
      timeLabel: null,
      title: "다음 일정 없음",
    };
  }

  return {
    dateLabel: formatInTimeZone(
      nextOccurrence.scheduledAtUtc,
      timezone,
      "M월 d일",
      { locale: ko }
    ),
    kind: "scheduled",
    metaLabel: getRelativeDayLabel(
      nextOccurrence.scheduledAtUtc,
      now,
      timezone
    ),
    timeLabel: formatUtcTimeInTimezone(nextOccurrence.scheduledAtUtc, timezone),
    title: "다음 일정",
  };
}

function getOverdueOccurrences(
  item: RecurringItem,
  completionLogs: CompletionLog[],
  now: Date,
  timezone: string
): DerivedOccurrence[] {
  const nowLocalDate = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const lookbackStartLocalDate = format(
    addDays(
      parse(nowLocalDate, "yyyy-MM-dd", new Date()),
      -OVERDUE_LOOKBACK_DAYS
    ),
    "yyyy-MM-dd"
  );
  const rangeStartUtc = fromZonedTime(
    `${lookbackStartLocalDate}T00:00:00.000`,
    timezone
  ).toISOString();

  return getOccurrencesInRange(
    item,
    rangeStartUtc,
    now.toISOString(),
    timezone,
    completionLogs,
    now.toISOString()
  )
    .filter((occurrence) => occurrence.status === "overdue")
    .sort(compareOccurrencesByScheduledAtUtcDesc);
}

function formatHistoryPreviewTime(
  scheduledAtUtc: string,
  timezone: string
): string {
  return `${formatLocalDateTitle(
    formatInTimeZone(scheduledAtUtc, timezone, "yyyy-MM-dd")
  )} ${formatUtcTimeInTimezone(scheduledAtUtc, timezone)}`;
}

function compareLogsByScheduledAtUtcDesc(
  left: CompletionLog,
  right: CompletionLog
): number {
  return right.scheduledAtUtc.localeCompare(left.scheduledAtUtc);
}

function compareOccurrencesByScheduledAtUtcDesc(
  left: DerivedOccurrence,
  right: DerivedOccurrence
): number {
  return right.scheduledAtUtc.localeCompare(left.scheduledAtUtc);
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

  const labels = weekdayMask
    .slice()
    .sort((left, right) => left - right)
    .map((value) => weekdayLabelByValue.get(value) ?? "");

  return `${baseLabel} ${labels.join("·")}`;
}

export function getSummaryNotificationLabel(item: RecurringItem): string {
  const currentSchedule = getCurrentScheduleVersion(item);

  return formatLocalTimeLabel(
    currentSchedule?.reminderTimeLocal ?? item.reminderTimeLocal
  );
}

function getRelativeDayLabel(
  scheduledAtUtc: string,
  now: Date,
  timezone: string
): string {
  const nowLocalDate = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const scheduledLocalDate = formatInTimeZone(
    scheduledAtUtc,
    timezone,
    "yyyy-MM-dd"
  );
  const dayDiff = differenceInCalendarDays(
    parse(scheduledLocalDate, "yyyy-MM-dd", new Date()),
    parse(nowLocalDate, "yyyy-MM-dd", new Date())
  );

  if (dayDiff === 0) {
    return "오늘";
  }

  if (dayDiff === 1) {
    return "내일";
  }

  return `${dayDiff}일 후`;
}
