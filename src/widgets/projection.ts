import { differenceInCalendarDays } from "date-fns/differenceInCalendarDays";
import { parse } from "date-fns/parse";
import { formatInTimeZone } from "date-fns-tz";
import type { TFunction } from "i18next";

import type { AppLanguage } from "~/i18n/language";
import { formatTimestamp } from "~/schedule/display/date";
import { getScheduleDisplayTitle } from "~/schedule/display/label";
import type { OccurrenceLog, Schedule } from "~/schedule/model";
import {
  selectLatestOverdue,
  selectScheduledOnDate,
} from "~/schedule/occurrence-policy";
import { createOccurrences } from "~/schedule/rules/occurrence";

export type HomeWidgetProps = {
  emptyMessage: string;
  items: {
    color: string;
    detail: string;
    title: string;
  }[];
  moreMedium: string;
  moreSmall: string;
};

/** 공통 occurrence 선택 결과를 위젯의 최소 표시 데이터로 만든다. */
export function createHomeWidgetProps({
  language,
  logs,
  now,
  schedules,
  t,
  timezone,
}: {
  language: AppLanguage;
  logs: OccurrenceLog[];
  now: Date;
  schedules: Schedule[];
  t: TFunction;
  timezone: string;
}): HomeWidgetProps {
  const occurrences = createOccurrences({
    logs,
    now,
    schedules,
    timezone,
  });
  const today = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const entries = [
    ...selectLatestOverdue({ now, occurrences, timezone }).sort((left, right) =>
      right.occurrence.scheduledAtUtc.localeCompare(
        left.occurrence.scheduledAtUtc
      )
    ),
    ...selectScheduledOnDate({
      localDate: today,
      occurrences,
      timezone,
    }).sort((left, right) =>
      left.occurrence.scheduledAtUtc.localeCompare(
        right.occurrence.scheduledAtUtc
      )
    ),
  ];

  return {
    emptyMessage: t("home.widget.empty"),
    items: entries.slice(0, 6).map(({ occurrence, schedule }) => ({
      color: schedule.colorHex,
      detail: getDetail(occurrence, today, timezone, language, t),
      title: getScheduleDisplayTitle(
        schedule,
        t("schedule.contentUnavailableTitle")
      ),
    })),
    moreMedium: getMoreLabel(entries.length, 6, t),
    moreSmall: getMoreLabel(entries.length, 3, t),
  };
}

function getDetail(
  occurrence: { localDate: string; scheduledAtUtc: string },
  today: string,
  timezone: string,
  language: AppLanguage,
  t: TFunction
): string {
  const time = formatTimestamp(
    occurrence.scheduledAtUtc,
    timezone,
    "time",
    language
  );

  if (occurrence.localDate >= today) {
    return time;
  }

  const days = differenceInCalendarDays(
    parse(today, "yyyy-MM-dd", new Date()),
    parse(occurrence.localDate, "yyyy-MM-dd", new Date())
  );
  return [t("home.feed.overdueDays", { count: days }), time].join(" · ");
}

function getMoreLabel(total: number, visible: number, t: TFunction): string {
  return total > visible
    ? t("home.widget.more", { count: total - visible })
    : "";
}
