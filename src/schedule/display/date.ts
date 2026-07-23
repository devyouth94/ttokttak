import type { Locale } from "date-fns";
import { format, parse } from "date-fns";
import { enUS, ko } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import type { AppLanguage } from "~/shared/i18n";

const localeByLanguage = {
  en: enUS,
  ko,
} as const satisfies Record<AppLanguage, Locale>;

const localFormats = {
  date: {
    input: "yyyy-MM-dd",
    output: { en: "MMM d", ko: "M월 d일" },
  },
  fullDate: {
    input: "yyyy-MM-dd",
    output: { en: "MMM d, yyyy", ko: "yyyy년 M월 d일" },
  },
  month: {
    input: "yyyy-MM",
    output: { en: "MMMM yyyy", ko: "yyyy년 M월" },
  },
  time: {
    input: "HH:mm",
    output: { en: "h:mm a", ko: "a h:mm" },
  },
  weekday: {
    input: "yyyy-MM-dd",
    output: { en: "EEE", ko: "EEE" },
  },
  weekdayDate: {
    input: "yyyy-MM-dd",
    output: { en: "EEEE, MMM d", ko: "M월 d일 EEEE" },
  },
} as const;

const timestampFormats = {
  date: { en: "MMM d", ko: "M월 d일" },
  time: { en: "h:mm a", ko: "a h:mm" },
} as const;

/** timezone 없는 local 날짜·시간 값을 표시 문구로 바꾼다. */
export function formatLocal(
  value: string,
  kind: keyof typeof localFormats,
  language: AppLanguage = "ko"
): string {
  const config = localFormats[kind];

  return format(
    parse(value, config.input, new Date()),
    config.output[language],
    {
      locale: localeByLanguage[language],
    }
  );
}

/** UTC timestamp를 지정한 timezone의 날짜·시간 문구로 바꾼다. */
export function formatTimestamp(
  value: string,
  timezone: string,
  kind: keyof typeof timestampFormats,
  language: AppLanguage = "ko"
): string {
  return formatInTimeZone(value, timezone, timestampFormats[kind][language], {
    locale: localeByLanguage[language],
  });
}
