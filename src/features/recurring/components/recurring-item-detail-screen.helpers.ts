import { addDays, differenceInCalendarDays, format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

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
  getRecurrenceLabel,
} from "~/features/recurring/utils/recurring-display";

const OVERDUE_LOOKBACK_DAYS = 730;

export type ItemDetailHistoryEntry = {
  action: CompletionLog["action"];
  id: string;
  scheduledAtUtc: string;
  statusLabel: string;
  timeLabel: string;
};

export type ItemDetailSummaryBadge = {
  id: string;
  label: string;
  value: string;
};

export type ItemDetailStatusCard = {
  dateLabel: string;
  metaLabel: string;
  timeLabel: string | null;
  title: string;
};

export type ItemDetailViewModel = {
  historyPreview: ItemDetailHistoryEntry[];
  nextOccurrence: DerivedOccurrence | null;
  overdueOccurrences: DerivedOccurrence[];
  primaryOccurrence: DerivedOccurrence | null;
  statusCard: ItemDetailStatusCard;
  summary: {
    notificationLabel: string;
    notificationsEnabled: boolean;
    recurrenceLabel: string;
    settingBadges: ItemDetailSummaryBadge[];
    title: string;
  };
};

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

export function buildOccurrenceStatusCard({
  now,
  occurrence,
  timezone,
}: {
  now: Date;
  occurrence: DerivedOccurrence;
  timezone: string;
}): ItemDetailStatusCard {
  const titleByStatus: Record<DerivedOccurrence["status"], string> = {
    completed: "완료한 일정",
    overdue: "지난 일정",
    scheduled: "예정 일정",
    skipped: "건너뛴 일정",
  };

  return {
    dateLabel: formatInTimeZone(
      occurrence.scheduledAtUtc,
      timezone,
      "M월 d일",
      {
        locale: ko,
      }
    ),
    metaLabel: getOccurrenceStatusMetaLabel({ now, occurrence, timezone }),
    timeLabel: formatUtcTimeInTimezone(occurrence.scheduledAtUtc, timezone),
    title: titleByStatus[occurrence.status],
  };
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
      notificationLabel: getSummaryNotificationLabel(item),
      notificationsEnabled: getSummaryNotificationsEnabled(item),
      recurrenceLabel: getRecurrenceLabel(item),
      settingBadges: buildSummarySettingBadges(item),
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

export function buildSummarySettingBadges(
  item: RecurringItem
): ItemDetailSummaryBadge[] {
  const currentSchedule = getCurrentScheduleVersion(item);
  const anchorType = currentSchedule?.anchorType ?? item.anchorType;
  const badges: ItemDetailSummaryBadge[] = [
    {
      id: "start-date",
      label: "시작",
      value: format(
        parse(item.startDateLocal, "yyyy-MM-dd", new Date()),
        "yyyy년 M월 d일",
        {
          locale: ko,
        }
      ),
    },
  ];

  if (anchorType === "completion_based") {
    badges.push({
      id: "anchor-type",
      label: "계산",
      value: "완료일 기준",
    });
  }

  return badges;
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
      metaLabel:
        overdueOccurrences.length === 1
          ? overdueDays === 0
            ? "오늘"
            : `${overdueDays}일 지남`
          : `지난 일정 ${overdueOccurrences.length}건`,
      timeLabel: formatUtcTimeInTimezone(
        latestOverdueOccurrence.scheduledAtUtc,
        timezone
      ),
      title: "지난 일정",
    };
  }

  if (!nextOccurrence) {
    return {
      dateLabel: "없음",
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

function getSummaryNotificationLabel(item: RecurringItem): string {
  const currentSchedule = getCurrentScheduleVersion(item);

  return formatLocalTimeLabel(
    currentSchedule?.reminderTimeLocal ?? item.reminderTimeLocal
  );
}

function getSummaryNotificationsEnabled(item: RecurringItem): boolean {
  const currentSchedule = getCurrentScheduleVersion(item);

  return currentSchedule?.notificationsEnabled ?? item.notificationsEnabled;
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

function getOccurrenceStatusMetaLabel({
  now,
  occurrence,
  timezone,
}: {
  now: Date;
  occurrence: DerivedOccurrence;
  timezone: string;
}): string {
  if (occurrence.status === "completed") {
    return "완료";
  }

  if (occurrence.status === "skipped") {
    return "건너뜀";
  }

  if (occurrence.status === "overdue") {
    const overdueDays = differenceInCalendarDays(
      parse(
        formatInTimeZone(now, timezone, "yyyy-MM-dd"),
        "yyyy-MM-dd",
        new Date()
      ),
      parse(occurrence.localDate, "yyyy-MM-dd", new Date())
    );

    return overdueDays === 0 ? "오늘" : `${overdueDays}일 지남`;
  }

  return getRelativeDayLabel(occurrence.scheduledAtUtc, now, timezone);
}
