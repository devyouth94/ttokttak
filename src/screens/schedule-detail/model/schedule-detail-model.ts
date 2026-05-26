import { addDays, differenceInCalendarDays, format, parse } from "date-fns";
import { enUS, ko } from "date-fns/locale";
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
import type { AppLanguage } from "~/shared/i18n";

const OVERDUE_LOOKBACK_DAYS = 730;

const dateLocaleByLanguage = {
  en: enUS,
  ko,
} as const;

const detailDateFormatByLanguage = {
  en: "MMM d",
  ko: "M월 d일",
} as const satisfies Record<AppLanguage, string>;

const summaryDateFormatByLanguage = {
  en: "MMM d, yyyy",
  ko: "yyyy년 M월 d일",
} as const satisfies Record<AppLanguage, string>;

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
  language = "ko",
  now,
  occurrence,
  timezone,
}: {
  language?: AppLanguage;
  now: Date;
  occurrence: DerivedOccurrence;
  timezone: string;
}): ItemDetailStatusCard {
  const titleByStatus = getOccurrenceStatusTitleByStatus(language);

  return {
    dateLabel: formatInTimeZone(
      occurrence.scheduledAtUtc,
      timezone,
      detailDateFormatByLanguage[language],
      {
        locale: dateLocaleByLanguage[language],
      }
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
  language = "ko",
  now,
  timezone,
}: {
  completionLogs: CompletionLog[];
  item: RecurringItem;
  language?: AppLanguage;
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

  return {
    description:
      language === "en"
        ? "There is a problem with the encryption key or saved content. You can delete this item if needed."
        : "암호화 키 또는 저장된 내용에 문제가 있어 내용을 열 수 없어요. 필요하면 이 일정을 삭제할 수 있어요.",
    title:
      language === "en"
        ? "Could not recover item content"
        : "일정 내용을 복구하지 못했어요",
  };
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
  const badges: ItemDetailSummaryBadge[] = [
    {
      id: "start-date",
      label: language === "en" ? "Start" : "시작",
      value: formatSummaryDate(item.startDateLocal, language),
    },
  ];

  if (endDateLocal) {
    badges.push({
      id: "end-date",
      label: language === "en" ? "End date" : "종료",
      value: formatSummaryDate(endDateLocal, language),
    });
  }

  if (anchorType === "completion_based") {
    badges.push({
      id: "anchor-type",
      label: language === "en" ? "Schedule" : "계산",
      value: language === "en" ? "Completion-based" : "완료일 기준",
    });
  }

  return badges;
}

function formatSummaryDate(localDate: string, language: AppLanguage): string {
  return format(
    parse(localDate, "yyyy-MM-dd", new Date()),
    summaryDateFormatByLanguage[language],
    {
      locale: dateLocaleByLanguage[language],
    }
  );
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
        detailDateFormatByLanguage[language],
        { locale: dateLocaleByLanguage[language] }
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
      title: language === "en" ? "Overdue" : "지난 일정",
    };
  }

  if (!nextOccurrence) {
    return {
      dateLabel: language === "en" ? "None" : "없음",
      metaLabel: language === "en" ? "No following item" : "후속 일정 없음",
      timeLabel: null,
      title: language === "en" ? "No upcoming item" : "다음 일정 없음",
    };
  }

  return {
    dateLabel: formatInTimeZone(
      nextOccurrence.scheduledAtUtc,
      timezone,
      detailDateFormatByLanguage[language],
      { locale: dateLocaleByLanguage[language] }
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
    title: language === "en" ? "Next item" : "다음 일정",
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
    return language === "en" ? "Today" : "오늘";
  }

  if (dayDiff === 1) {
    return language === "en" ? "Tomorrow" : "내일";
  }

  return language === "en" ? `In ${dayDiff} days` : `${dayDiff}일 후`;
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
  return language === "en"
    ? {
        completed: "Completed item",
        overdue: "Overdue",
        scheduled: "Scheduled item",
        skipped: "Skipped item",
      }
    : {
        completed: "완료한 일정",
        overdue: "지난 일정",
        scheduled: "예정 일정",
        skipped: "건너뛴 일정",
      };
}

function getOverdueDaysLabel(
  overdueDays: number,
  language: AppLanguage
): string {
  if (overdueDays === 0) {
    return language === "en" ? "Today" : "오늘";
  }

  return language === "en"
    ? overdueDays === 1
      ? "1 day overdue"
      : `${overdueDays} days overdue`
    : `${overdueDays}일 지남`;
}

function getOverdueCountLabel(count: number, language: AppLanguage): string {
  if (language === "en") {
    return count === 1 ? "1 overdue item" : `${count} overdue items`;
  }

  return `지난 일정 ${count}건`;
}
