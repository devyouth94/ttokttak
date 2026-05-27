import type { ResolvedAppTheme } from "~/shared/theme/app-theme";

export function getCalendarRenderKey({
  resolvedTheme,
  visibleMonth,
}: {
  resolvedTheme: ResolvedAppTheme;
  visibleMonth: string;
}): string {
  return `${visibleMonth}:${resolvedTheme}`;
}
