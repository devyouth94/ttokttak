import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import type { CompletionAction } from "~/features/recurring/domain/types";

export function formatLocalDateTitle(localDate: string): string {
  return format(parse(localDate, "yyyy-MM-dd", new Date()), "M월 d일", {
    locale: ko,
  });
}

export function formatLocalTimeLabel(localTime: string): string {
  return format(parse(localTime, "HH:mm", new Date()), "a h:mm", {
    locale: ko,
  });
}

export function formatUtcTimeInTimezone(
  utcDateTime: string,
  timezone: string
): string {
  return formatInTimeZone(utcDateTime, timezone, "a h:mm", {
    locale: ko,
  });
}

export function getCompletionActionLabel(action: CompletionAction): string {
  return action === "completed" ? "완료" : "건너뜀";
}
