import { addDays } from "date-fns/addDays";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import { fromZonedTime } from "date-fns-tz";

export type UtcRange = {
  endUtc: string;
  startUtc: string;
};

/** yyyy-MM-dd local date에 날짜 수를 더한다. */
export function addLocalDays(localDate: string, amount: number): string {
  return format(
    addDays(parse(localDate, "yyyy-MM-dd", new Date()), amount),
    "yyyy-MM-dd"
  );
}

/** local date 하루를 timezone 기준 UTC 범위로 바꾼다. */
export function toUtcRange(localDate: string, timezone: string): UtcRange {
  return {
    endUtc: fromZonedTime(`${localDate}T23:59:59.999`, timezone).toISOString(),
    startUtc: fromZonedTime(
      `${localDate}T00:00:00.000`,
      timezone
    ).toISOString(),
  };
}
