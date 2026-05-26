import { useTranslation } from "react-i18next";

import {
  AppSelectMenu,
  type AppSelectMenuOption,
} from "~/shared/ui/app-select-menu";

import type { ScheduleListSortMode } from "../model/schedule-list-entries";

type ScheduleListSortControlProps = {
  onChange: (value: ScheduleListSortMode) => void;
  value: ScheduleListSortMode;
};

export function ScheduleListSortControl({
  onChange,
  value,
}: ScheduleListSortControlProps): React.JSX.Element {
  const { t } = useTranslation();
  const sortOptions: AppSelectMenuOption<ScheduleListSortMode>[] = [
    {
      accessibilityHint: t("scheduleList.sort.titleAscHint"),
      label: t("scheduleList.sort.titleAsc"),
      value: "titleAsc",
    },
    {
      accessibilityHint: t("scheduleList.sort.createdDescHint"),
      label: t("scheduleList.sort.createdDesc"),
      value: "createdDesc",
    },
  ];
  const selectedOption = getSortOption(value, sortOptions);

  return (
    <AppSelectMenu
      accessibilityHint={t("scheduleList.sort.menuHint")}
      accessibilityLabel={t("scheduleList.sort.menuLabel", {
        label: selectedOption.label,
      })}
      align="end"
      options={sortOptions}
      value={selectedOption.value}
      variant="compact"
      onChange={onChange}
    />
  );
}

function getSortOption(
  value: ScheduleListSortMode,
  sortOptions: AppSelectMenuOption<ScheduleListSortMode>[]
): {
  accessibilityHint?: string;
  label: string;
  value: ScheduleListSortMode;
} {
  return (
    sortOptions.find((option) => option.value === value) ?? sortOptions[0]!
  );
}
