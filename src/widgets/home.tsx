import type { AppLanguage } from "~/i18n/language";

/** iOS가 아닌 플랫폼에는 홈 화면 위젯이 없다. */
export function syncHomeWidget(params: {
  language: AppLanguage;
  timezone: string;
  userId?: string;
}): Promise<void> {
  void params;
  return Promise.resolve();
}
