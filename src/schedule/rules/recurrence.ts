import { addDays } from "date-fns/addDays";
import { differenceInCalendarDays } from "date-fns/differenceInCalendarDays";
import { formatInTimeZone } from "date-fns-tz";

import type { RecurrenceType } from "../model";

const CALENDAR_HOUR = 12;

export type RecurrenceRule = {
  endDateLocal?: string | null;
  intervalValue?: number | null;
  recurrenceType: RecurrenceType;
  startDateLocal: string;
  weekdayMask?: number[] | null;
};

/** 반복 유형이 간격 값을 필요로 하는지 확인한다. */
export function requiresInterval(recurrenceType: RecurrenceType): boolean {
  return recurrenceType.startsWith("interval_");
}

/** 반복 유형이 요일 선택을 필요로 하는지 확인한다. */
export function requiresWeekdays(recurrenceType: RecurrenceType): boolean {
  return recurrenceType === "weekly" || recurrenceType === "interval_weeks";
}

/** 반복 방식이 완료일을 다음 occurrence 기준으로 사용할 수 있는지 확인한다. */
export function supportsCompletion(recurrenceType: RecurrenceType): boolean {
  return (
    recurrenceType === "daily" ||
    recurrenceType === "interval_days" ||
    recurrenceType === "monthly" ||
    recurrenceType === "interval_months"
  );
}

/** 반복 규칙이 만드는 첫 local date를 반환한다. */
export function firstDate(rule: RecurrenceRule): string | null {
  if (
    rule.recurrenceType === "weekly" ||
    rule.recurrenceType === "interval_weeks"
  ) {
    return weeklyDate(rule, rule.startDateLocal);
  }

  return rule.startDateLocal;
}

/** 현재 local date 다음에 오는 local date를 반환한다. */
export function nextDate(
  rule: RecurrenceRule,
  currentDate: string,
  anchorDate: string = currentDate
): string | null {
  let next: string | null;

  switch (rule.recurrenceType) {
    case "once":
      return null;
    case "daily":
      next = formatDate(addDays(parseDate(currentDate), 1));
      break;
    case "interval_days":
      next = formatDate(
        addDays(parseDate(currentDate), rule.intervalValue ?? 1)
      );
      break;
    case "weekly":
    case "interval_weeks":
      next = weeklyDate(rule, formatDate(addDays(parseDate(currentDate), 1)));
      break;
    case "monthly":
      next = addMonths(currentDate, anchorDate, 1);
      break;
    case "interval_months":
      next = addMonths(currentDate, anchorDate, rule.intervalValue ?? 1);
      break;
  }

  if (next != null && next <= currentDate) {
    throw new Error("반복 규칙의 다음 날짜는 현재 날짜보다 느려야 합니다.");
  }

  return next;
}

function parseDate(localDate: string): Date {
  const [year, month, day] = localDate.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, CALENDAR_HOUR));
}

function formatDate(date: Date): string {
  return formatInTimeZone(date, "UTC", "yyyy-MM-dd");
}

function addMonths(
  localDate: string,
  anchorDate: string,
  months: number
): string {
  const current = parseDate(localDate);
  const anchor = parseDate(anchorDate);
  const target = new Date(
    Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth() + months,
      1,
      CALENDAR_HOUR
    )
  );
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();

  target.setUTCDate(Math.min(anchor.getUTCDate(), lastDay));

  return formatDate(target);
}

function weeklyDate(rule: RecurrenceRule, minimumDate: string): string | null {
  const weekdays = [...new Set(rule.weekdayMask)]
    .filter((weekday) => weekday >= 0 && weekday <= 6)
    .sort((left, right) => left - right);
  const interval =
    rule.recurrenceType === "interval_weeks" ? (rule.intervalValue ?? 1) : 1;

  if (weekdays.length === 0 || !Number.isInteger(interval) || interval < 1) {
    return null;
  }

  const minimum = parseDate(
    minimumDate < rule.startDateLocal ? rule.startDateLocal : minimumDate
  );
  const anchor = parseDate(rule.startDateLocal);
  const anchorWeek = addDays(anchor, -anchor.getUTCDay());
  let week = addDays(minimum, -minimum.getUTCDay());
  const passedWeeks = differenceInCalendarDays(week, anchorWeek) / 7;
  const remainder = passedWeeks % interval;

  if (remainder !== 0) {
    week = addDays(week, (interval - remainder) * 7);
  }

  for (const weekday of weekdays) {
    const candidate = formatDate(addDays(week, weekday));

    if (candidate >= formatDate(minimum)) {
      return candidate;
    }
  }

  return formatDate(addDays(week, interval * 7 + weekdays[0]!));
}
