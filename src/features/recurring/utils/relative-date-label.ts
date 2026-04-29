import { differenceInCalendarDays, format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

const DEFAULT_RELATIVE_DAY_LIMIT = 14;

type FormatRelativeDateLabelOptions = {
  baseLocalDate: string;
  relativeDayLimit?: number;
  targetLocalDate: string;
};

type FormatRelativeDateLabelFromUtcOptions = {
  now: Date;
  relativeDayLimit?: number;
  scheduledAtUtc: string;
  timezone: string;
};

export function formatRelativeDateLabel({
  baseLocalDate,
  relativeDayLimit = DEFAULT_RELATIVE_DAY_LIMIT,
  targetLocalDate,
}: FormatRelativeDateLabelOptions): string {
  const dayDiff = differenceInCalendarDays(
    parse(targetLocalDate, "yyyy-MM-dd", new Date()),
    parse(baseLocalDate, "yyyy-MM-dd", new Date())
  );

  if (dayDiff === 0) {
    return "오늘";
  }

  if (dayDiff === 1) {
    return "내일";
  }

  if (dayDiff > 1 && dayDiff <= relativeDayLimit) {
    return `${dayDiff}일 후`;
  }

  return format(parse(targetLocalDate, "yyyy-MM-dd", new Date()), "M월 d일", {
    locale: ko,
  });
}

export function formatRelativeDateLabelFromUtc({
  now,
  relativeDayLimit,
  scheduledAtUtc,
  timezone,
}: FormatRelativeDateLabelFromUtcOptions): string {
  return formatRelativeDateLabel({
    baseLocalDate: formatInTimeZone(now, timezone, "yyyy-MM-dd"),
    relativeDayLimit,
    targetLocalDate: formatInTimeZone(scheduledAtUtc, timezone, "yyyy-MM-dd"),
  });
}
