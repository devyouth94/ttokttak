import type { ResolvedTheme } from "~/theme/preference";

export function getCalendarRenderKey({
  resolvedTheme,
  visibleMonth,
}: {
  resolvedTheme: ResolvedTheme;
  visibleMonth: string;
}): string {
  return `${visibleMonth}:${resolvedTheme}`;
}
