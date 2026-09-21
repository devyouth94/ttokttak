import { formatInTimeZone } from "date-fns-tz";
import type { TFunction } from "i18next";

import type { AppLanguage } from "~/i18n/language";
import { colorByKey } from "~/schedule/display/color";
import { createHomeSections } from "~/schedule/home-feed";
import type { OccurrenceLog } from "~/schedule/rules/occurrence";
import type { Schedule } from "~/schedule/schedule";

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

/** 기존 홈 projection에서 위젯에 저장할 최소 표시 데이터만 고른다. */
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
  const cards = createHomeSections({
    language,
    logs,
    now,
    schedules,
    selectedDateId: formatInTimeZone(now, timezone, "yyyy-MM-dd"),
    t,
    timezone,
  }).flatMap((section) => (section.id === "upcoming" ? [] : section.items));

  return {
    emptyMessage: t("home.widget.empty"),
    items: cards.slice(0, 6).map((card) => ({
      color: colorByKey[card.item.colorKey].swatchColor,
      detail: card.compactMetaLine,
      title: card.item.title,
    })),
    moreMedium: getMoreLabel(cards.length, 6, t),
    moreSmall: getMoreLabel(cards.length, 3, t),
  };
}

function getMoreLabel(total: number, visible: number, t: TFunction): string {
  return total > visible
    ? t("home.widget.more", { count: total - visible })
    : "";
}
