import { addDays, differenceInCalendarDays, format, parse } from "date-fns";
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
  formatFullLocalDate,
  formatLocalDateTitle,
  formatLocalTimeLabel,
  formatUtcDateTitleInTimezone,
  formatUtcTimeInTimezone,
  getCompletionActionLabel,
  getCurrentScheduleVersion,
  getRecurrenceLabel,
} from "~/entities/schedule";
import type { AppLanguage } from "~/shared/i18n";

const OVERDUE_LOOKBACK_DAYS = 730;

const contentRecoveryCopyByLanguage = {
  en: {
    description:
      "There is a problem with the encryption key or saved content. You can delete this item if needed.",
    title: "Could not recover item content",
  },
  ko: {
    description:
      "암호화 키 또는 저장된 내용에 문제가 있어 내용을 열 수 없어요. 필요하면 이 일정을 삭제할 수 있어요.",
    title: "일정 내용을 복구하지 못했어요",
  },
} as const satisfies Record<AppLanguage, ItemDetailContentRecovery>;

const summaryBadgeCopyByLanguage = {
  en: {
    anchorTypeLabel: "Schedule",
    completionBasedValue: "Completion-based",
    endDateLabel: "End date",
    startDateLabel: "Start",
  },
  ko: {
    anchorTypeLabel: "계산",
    completionBasedValue: "완료일 기준",
    endDateLabel: "종료",
    startDateLabel: "시작",
  },
} as const satisfies Record<
  AppLanguage,
  Record<
    | "anchorTypeLabel"
    | "completionBasedValue"
    | "endDateLabel"
    | "startDateLabel",
    string
  >
>;

const statusCardCopyByLanguage = {
  en: {
    completed: "Completed item",
    noFollowingItem: "No following item",
    noUpcomingDate: "None",
    noUpcomingTitle: "No upcoming item",
    overdue: "Overdue",
    scheduled: "Scheduled item",
    skipped: "Skipped item",
    nextItem: "Next item",
    today: "Today",
    tomorrow: "Tomorrow",
  },
  ko: {
    completed: "완료한 일정",
    noFollowingItem: "후속 일정 없음",
    noUpcomingDate: "없음",
    noUpcomingTitle: "다음 일정 없음",
    overdue: "지난 일정",
    scheduled: "예정 일정",
    skipped: "건너뛴 일정",
    nextItem: "다음 일정",
    today: "오늘",
    tomorrow: "내일",
  },
} as const satisfies Record<
  AppLanguage,
  Record<
    | "completed"
    | "nextItem"
    | "noFollowingItem"
    | "noUpcomingDate"
    | "noUpcomingTitle"
    | "overdue"
    | "scheduled"
    | "skipped"
    | "today"
    | "tomorrow",
    string
  >
>;

const relativeDayLabelFormatters = {
  en: (dayDiff: number) => `In ${dayDiff} days`,
  ko: (dayDiff: number) => `${dayDiff}일 후`,
} as const satisfies Record<AppLanguage, (dayDiff: number) => string>;

const overdueDaysLabelFormatters = {
  en: (overdueDays: number) =>
    overdueDays === 1 ? "1 day overdue" : `${overdueDays} days overdue`,
  ko: (overdueDays: number) => `${overdueDays}일 지남`,
} as const satisfies Record<AppLanguage, (overdueDays: number) => string>;

const overdueCountLabelFormatters = {
  en: (count: number) =>
    count === 1 ? "1 overdue item" : `${count} overdue items`,
  ko: (count: number) => `지난 일정 ${count}건`,
} as const satisfies Record<AppLanguage, (count: number) => string>;

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

export function buildOccurrenceStatusCard({
  language,
  now,
  occurrence,
  timezone,
}: {
  language: AppLanguage;
  now: Date;
  occurrence: DerivedOccurrence;
  timezone: string;
}): ItemDetailStatusCard {
  const titleByStatus = getOccurrenceStatusTitleByStatus(language);

  return {
    dateLabel: formatUtcDateTitleInTimezone(
      occurrence.scheduledAtUtc,
      timezone,
      language
    ),
    metaLabel: getOccurrenceStatusMetaLabel({
      language,
      now,
      occurrence,
      timezone,
    }),
    timeLabel: formatUtcTimeInTimezone(
      occurrence.scheduledAtUtc,
      timezone,
      language
    ),
    title: titleByStatus[occurrence.status],
  };
}

export function buildRecurringItemDetailViewModel({
  completionLogs,
  item,
  language,
  nextOccurrence: providedNextOccurrence,
  now,
  overdueOccurrences: providedOverdueOccurrences,
  timezone,
}: {
  completionLogs: CompletionLog[];
  item: RecurringItem;
  language: AppLanguage;
  nextOccurrence?: DerivedOccurrence | null;
  now: Date;
  overdueOccurrences?: DerivedOccurrence[];
  timezone: string;
}): ItemDetailViewModel {
  const projection =
    providedOverdueOccurrences === undefined ||
    providedNextOccurrence === undefined
      ? createItemOccurrenceProjection({
          completionLogs,
          item,
          now,
          timezone,
        })
      : null;
  const overdueOccurrences =
    providedOverdueOccurrences ??
    getOverdueOccurrences(projection!, now, timezone);
  const nextOccurrence =
    providedNextOccurrence ?? projection!.getNextOccurrence();
  const primaryOccurrence = overdueOccurrences[0] ?? nextOccurrence;

  return {
    contentRecovery: getContentRecoveryState(item, language),
    historyPreview: buildHistoryPreview(completionLogs, timezone, language),
    nextOccurrence,
    overdueOccurrences,
    primaryOccurrence,
    statusCard: buildStatusCard({
      language,
      now,
      nextOccurrence,
      overdueOccurrences,
      timezone,
    }),
    summary: {
      colorKey: item.colorKey,
      notificationLabel: getSummaryNotificationLabel(item, language),
      notificationsEnabled: getSummaryNotificationsEnabled(item),
      recurrenceLabel: getRecurrenceLabel(item, language),
      settingBadges: buildSummarySettingBadges(item, language),
      title: item.title,
    },
  };
}

function getContentRecoveryState(
  item: RecurringItem,
  language: AppLanguage
): ItemDetailContentRecovery | undefined {
  if (item.contentStatus?.status !== "unrecoverable") {
    return undefined;
  }

  return contentRecoveryCopyByLanguage[language];
}

export function buildHistoryPreview(
  completionLogs: CompletionLog[],
  timezone: string,
  language: AppLanguage = "ko"
): ItemDetailHistoryEntry[] {
  return completionLogs
    .slice()
    .sort(compareLogsByScheduledAtUtcDesc)
    .slice(0, 5)
    .map((log) => ({
      action: log.action,
      id: log.id,
      scheduledAtUtc: log.scheduledAtUtc,
      statusLabel: getCompletionActionLabel(log.action, language),
      timeLabel: formatHistoryPreviewTime(
        log.scheduledAtUtc,
        timezone,
        language
      ),
    }));
}

export function buildSummarySettingBadges(
  item: RecurringItem,
  language: AppLanguage = "ko"
): ItemDetailSummaryBadge[] {
  const currentSchedule = getCurrentScheduleVersion(item);
  const anchorType = currentSchedule?.anchorType ?? item.anchorType;
  const endDateLocal = currentSchedule
    ? (currentSchedule.endDateLocal ?? null)
    : (item.endDateLocal ?? null);
  const copy = summaryBadgeCopyByLanguage[language];
  const badges: ItemDetailSummaryBadge[] = [
    {
      id: "start-date",
      label: copy.startDateLabel,
      value: formatFullLocalDate(item.startDateLocal, language),
    },
  ];

  if (endDateLocal) {
    badges.push({
      id: "end-date",
      label: copy.endDateLabel,
      value: formatFullLocalDate(endDateLocal, language),
    });
  }

  if (anchorType === "completion_based") {
    badges.push({
      id: "anchor-type",
      label: copy.anchorTypeLabel,
      value: copy.completionBasedValue,
    });
  }

  return badges;
}

function buildStatusCard({
  language,
  now,
  nextOccurrence,
  overdueOccurrences,
  timezone,
}: {
  language: AppLanguage;
  now: Date;
  nextOccurrence: DerivedOccurrence | null;
  overdueOccurrences: DerivedOccurrence[];
  timezone: string;
}): ItemDetailStatusCard {
  const copy = statusCardCopyByLanguage[language];

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
      dateLabel: formatUtcDateTitleInTimezone(
        latestOverdueOccurrence.scheduledAtUtc,
        timezone,
        language
      ),
      metaLabel:
        overdueOccurrences.length === 1
          ? getOverdueDaysLabel(overdueDays, language)
          : getOverdueCountLabel(overdueOccurrences.length, language),
      timeLabel: formatUtcTimeInTimezone(
        latestOverdueOccurrence.scheduledAtUtc,
        timezone,
        language
      ),
      title: copy.overdue,
    };
  }

  if (!nextOccurrence) {
    return {
      dateLabel: copy.noUpcomingDate,
      metaLabel: copy.noFollowingItem,
      timeLabel: null,
      title: copy.noUpcomingTitle,
    };
  }

  return {
    dateLabel: formatUtcDateTitleInTimezone(
      nextOccurrence.scheduledAtUtc,
      timezone,
      language
    ),
    metaLabel: getRelativeDayLabel(
      nextOccurrence.scheduledAtUtc,
      now,
      timezone,
      language
    ),
    timeLabel: formatUtcTimeInTimezone(
      nextOccurrence.scheduledAtUtc,
      timezone,
      language
    ),
    title: copy.nextItem,
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
  timezone: string,
  language: AppLanguage
): string {
  return `${formatLocalDateTitle(
    formatInTimeZone(scheduledAtUtc, timezone, "yyyy-MM-dd"),
    language
  )} ${formatUtcTimeInTimezone(scheduledAtUtc, timezone, language)}`;
}

function compareLogsByScheduledAtUtcDesc(
  left: CompletionLog,
  right: CompletionLog
): number {
  return right.scheduledAtUtc.localeCompare(left.scheduledAtUtc);
}

function getSummaryNotificationLabel(
  item: RecurringItem,
  language: AppLanguage
): string {
  const currentSchedule = getCurrentScheduleVersion(item);

  return formatLocalTimeLabel(
    currentSchedule?.reminderTimeLocal ?? item.reminderTimeLocal,
    language
  );
}

function getSummaryNotificationsEnabled(item: RecurringItem): boolean {
  const currentSchedule = getCurrentScheduleVersion(item);

  return currentSchedule?.notificationsEnabled ?? item.notificationsEnabled;
}

function getRelativeDayLabel(
  scheduledAtUtc: string,
  now: Date,
  timezone: string,
  language: AppLanguage
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
    return statusCardCopyByLanguage[language].today;
  }

  if (dayDiff === 1) {
    return statusCardCopyByLanguage[language].tomorrow;
  }

  return relativeDayLabelFormatters[language](dayDiff);
}

function getOccurrenceStatusMetaLabel({
  language,
  now,
  occurrence,
  timezone,
}: {
  language: AppLanguage;
  now: Date;
  occurrence: DerivedOccurrence;
  timezone: string;
}): string {
  if (occurrence.status === "completed") {
    return getCompletionActionLabel("completed", language);
  }

  if (occurrence.status === "skipped") {
    return getCompletionActionLabel("skipped", language);
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

    return getOverdueDaysLabel(overdueDays, language);
  }

  return getRelativeDayLabel(
    occurrence.scheduledAtUtc,
    now,
    timezone,
    language
  );
}

function getOccurrenceStatusTitleByStatus(
  language: AppLanguage
): Record<DerivedOccurrence["status"], string> {
  const copy = statusCardCopyByLanguage[language];

  return {
    completed: copy.completed,
    overdue: copy.overdue,
    scheduled: copy.scheduled,
    skipped: copy.skipped,
  };
}

function getOverdueDaysLabel(
  overdueDays: number,
  language: AppLanguage
): string {
  if (overdueDays === 0) {
    return statusCardCopyByLanguage[language].today;
  }

  return overdueDaysLabelFormatters[language](overdueDays);
}

function getOverdueCountLabel(count: number, language: AppLanguage): string {
  return overdueCountLabelFormatters[language](count);
}
