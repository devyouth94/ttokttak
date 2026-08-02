import { addDays, differenceInCalendarDays, format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import type { AppLanguage } from "~/i18n/app-language";
import type { ColorKey } from "~/schedule/display/color";
import { formatLocal, formatTimestamp } from "~/schedule/display/date";
import { getActionLabel, getRecurrenceLabel } from "~/schedule/display/label";
import type { Occurrence, OccurrenceLog } from "~/schedule/rules/occurrence";
import { createOccurrences, toUtcRange } from "~/schedule/rules/occurrence";
import type { Schedule } from "~/schedule/schedule";
import { currentRule } from "~/schedule/schedule";

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
  action: OccurrenceLog["action"];
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
  nextOccurrence: Occurrence | null;
  overdueOccurrences: Occurrence[];
  primaryOccurrence: Occurrence | null;
  statusCard: ItemDetailStatusCard;
  summary: {
    colorKey: ColorKey;
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
  occurrence: Occurrence;
  timezone: string;
}): ItemDetailStatusCard {
  const titleByStatus = getOccurrenceStatusTitleByStatus(language);

  return {
    dateLabel: formatTimestamp(
      occurrence.scheduledAtUtc,
      timezone,
      "date",
      language
    ),
    metaLabel: getOccurrenceStatusMetaLabel({
      language,
      now,
      occurrence,
      timezone,
    }),
    timeLabel: formatTimestamp(
      occurrence.scheduledAtUtc,
      timezone,
      "time",
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
  completionLogs: OccurrenceLog[];
  item: Schedule;
  language: AppLanguage;
  nextOccurrence?: Occurrence | null;
  now: Date;
  overdueOccurrences?: Occurrence[];
  timezone: string;
}): ItemDetailViewModel {
  const occurrences =
    providedOverdueOccurrences === undefined ||
    providedNextOccurrence === undefined
      ? createOccurrences({
          logs: completionLogs,
          now,
          schedules: [item],
          timezone,
        })
      : null;
  const overdueOccurrences =
    providedOverdueOccurrences ??
    getOverdueOccurrences(occurrences!, now, timezone);
  const nextOccurrence = providedNextOccurrence ?? occurrences!.next(item.id);
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
  item: Schedule,
  language: AppLanguage
): ItemDetailContentRecovery | undefined {
  if (item.contentStatus !== "unrecoverable") {
    return undefined;
  }

  return contentRecoveryCopyByLanguage[language];
}

export function buildHistoryPreview(
  completionLogs: OccurrenceLog[],
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
      statusLabel: getActionLabel(log.action, language),
      timeLabel: formatHistoryPreviewTime(
        log.scheduledAtUtc,
        timezone,
        language
      ),
    }));
}

export function buildSummarySettingBadges(
  item: Schedule,
  language: AppLanguage = "ko"
): ItemDetailSummaryBadge[] {
  const currentSchedule = currentRule(item);
  const anchorType = currentSchedule.anchorType;
  const endDateLocal = currentSchedule.endDateLocal ?? null;
  const copy = summaryBadgeCopyByLanguage[language];
  const badges: ItemDetailSummaryBadge[] = [
    {
      id: "start-date",
      label: copy.startDateLabel,
      value: formatLocal(item.startDateLocal, "fullDate", language),
    },
  ];

  if (endDateLocal) {
    badges.push({
      id: "end-date",
      label: copy.endDateLabel,
      value: formatLocal(endDateLocal, "fullDate", language),
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
  nextOccurrence: Occurrence | null;
  overdueOccurrences: Occurrence[];
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
      dateLabel: formatTimestamp(
        latestOverdueOccurrence.scheduledAtUtc,
        timezone,
        "date",
        language
      ),
      metaLabel:
        overdueOccurrences.length === 1
          ? getOverdueDaysLabel(overdueDays, language)
          : getOverdueCountLabel(overdueOccurrences.length, language),
      timeLabel: formatTimestamp(
        latestOverdueOccurrence.scheduledAtUtc,
        timezone,
        "time",
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
    dateLabel: formatTimestamp(
      nextOccurrence.scheduledAtUtc,
      timezone,
      "date",
      language
    ),
    metaLabel: getRelativeDayLabel(
      nextOccurrence.scheduledAtUtc,
      now,
      timezone,
      language
    ),
    timeLabel: formatTimestamp(
      nextOccurrence.scheduledAtUtc,
      timezone,
      "time",
      language
    ),
    title: copy.nextItem,
  };
}

function getOverdueOccurrences(
  occurrences: ReturnType<typeof createOccurrences>,
  now: Date,
  timezone: string
): Occurrence[] {
  const nowLocalDate = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const lookbackStartLocalDate = format(
    addDays(
      parse(nowLocalDate, "yyyy-MM-dd", new Date()),
      -OVERDUE_LOOKBACK_DAYS
    ),
    "yyyy-MM-dd"
  );
  return occurrences
    .range(
      {
        endUtc: now.toISOString(),
        startUtc: toUtcRange(lookbackStartLocalDate, timezone).startUtc,
      },
      "overdue"
    )
    .map(({ occurrence }) => occurrence)
    .sort((left, right) =>
      right.scheduledAtUtc.localeCompare(left.scheduledAtUtc)
    );
}

function formatHistoryPreviewTime(
  scheduledAtUtc: string,
  timezone: string,
  language: AppLanguage
): string {
  return `${formatLocal(
    formatInTimeZone(scheduledAtUtc, timezone, "yyyy-MM-dd"),
    "date",
    language
  )} ${formatTimestamp(scheduledAtUtc, timezone, "time", language)}`;
}

function compareLogsByScheduledAtUtcDesc(
  left: OccurrenceLog,
  right: OccurrenceLog
): number {
  return right.scheduledAtUtc.localeCompare(left.scheduledAtUtc);
}

function getSummaryNotificationLabel(
  item: Schedule,
  language: AppLanguage
): string {
  return formatLocal(currentRule(item).reminderTimeLocal, "time", language);
}

function getSummaryNotificationsEnabled(item: Schedule): boolean {
  return currentRule(item).notificationsEnabled;
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
  occurrence: Occurrence;
  timezone: string;
}): string {
  if (occurrence.status === "completed") {
    return getActionLabel("completed", language);
  }

  if (occurrence.status === "skipped") {
    return getActionLabel("skipped", language);
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
): Record<Occurrence["status"], string> {
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
