import { addDays, differenceInCalendarDays, format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import type {
  CompletionLog,
  DerivedOccurrence,
  ItemOccurrenceProjection,
  RecurringItem,
  RecurringItemColorKey,
} from "~/entities/schedule";
import {
  createItemOccurrenceProjection,
  formatLocalDateTitle,
  formatLocalTimeLabel,
  formatUtcTimeInTimezone,
  getCompletionActionLabel,
  getCurrentScheduleVersion,
  getRecurrenceLabel,
} from "~/entities/schedule";

const OVERDUE_LOOKBACK_DAYS = 730;

type RecurringItemDetailReturnPath = "/" | "/calendar" | "/home" | "/schedule";

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

export type ItemDetailContentRecovery = {
  description: string;
  title: string;
};

export type ItemDetailViewModel = {
  contentRecovery?: ItemDetailContentRecovery;
  historyPreview: ItemDetailHistoryEntry[];
  nextOccurrence: DerivedOccurrence | null;
  overdueOccurrences: DerivedOccurrence[];
  primaryOccurrence: DerivedOccurrence | null;
  statusCard: ItemDetailStatusCard;
  summary: {
    colorKey: RecurringItemColorKey;
    notificationLabel: string;
    notificationsEnabled: boolean;
    recurrenceLabel: string;
    settingBadges: ItemDetailSummaryBadge[];
    title: string;
  };
};

export function getRecurringItemDetailDeleteReturnPath(
  returnTo?: string
): RecurringItemDetailReturnPath {
  if (
    returnTo === "/calendar" ||
    returnTo === "/home" ||
    returnTo === "/schedule"
  ) {
    return returnTo;
  }

  return "/";
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
  return createItemOccurrenceProjection({
    completionLogs,
    item,
    now,
    timezone,
  }).getBasisOccurrence({
    fallbackOccurrence: primaryOccurrence,
    scheduledAtUtc,
  });
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
  const projection = createItemOccurrenceProjection({
    completionLogs,
    item,
    now,
    timezone,
  });
  const overdueOccurrences = getOverdueOccurrences(projection, now, timezone);
  const nextOccurrence = projection.getNextOccurrence();
  const primaryOccurrence = overdueOccurrences[0] ?? nextOccurrence;

  return {
    contentRecovery: getContentRecoveryState(item),
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
      colorKey: item.colorKey,
      notificationLabel: getSummaryNotificationLabel(item),
      notificationsEnabled: getSummaryNotificationsEnabled(item),
      recurrenceLabel: getRecurrenceLabel(item),
      settingBadges: buildSummarySettingBadges(item),
      title: item.title,
    },
  };
}

function getContentRecoveryState(
  item: RecurringItem
): ItemDetailContentRecovery | undefined {
  if (item.contentStatus?.status !== "unrecoverable") {
    return undefined;
  }

  return {
    description:
      "암호화 키 또는 저장된 내용에 문제가 있어 내용을 열 수 없어요. 필요하면 이 일정을 삭제할 수 있어요.",
    title: "일정 내용을 복구하지 못했어요",
  };
}

export function buildHistoryPreview(
  completionLogs: CompletionLog[],
  timezone: string
): ItemDetailHistoryEntry[] {
  return completionLogs
    .slice()
    .sort(compareLogsByScheduledAtUtcDesc)
    .slice(0, 5)
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
  const endDateLocal = currentSchedule
    ? (currentSchedule.endDateLocal ?? null)
    : (item.endDateLocal ?? null);
  const badges: ItemDetailSummaryBadge[] = [
    {
      id: "start-date",
      label: "시작",
      value: formatSummaryDate(item.startDateLocal),
    },
  ];

  if (endDateLocal) {
    badges.push({
      id: "end-date",
      label: "종료",
      value: formatSummaryDate(endDateLocal),
    });
  }

  if (anchorType === "completion_based") {
    badges.push({
      id: "anchor-type",
      label: "계산",
      value: "완료일 기준",
    });
  }

  return badges;
}

function formatSummaryDate(localDate: string): string {
  return format(parse(localDate, "yyyy-MM-dd", new Date()), "yyyy년 M월 d일", {
    locale: ko,
  });
}

function buildStatusCard({
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
  projection: ItemOccurrenceProjection,
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
  return projection.getOverdueOccurrences({
    lookbackStartLocalDate,
    order: "scheduledAtDesc",
    rangeEndUtc: now.toISOString(),
  });
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
