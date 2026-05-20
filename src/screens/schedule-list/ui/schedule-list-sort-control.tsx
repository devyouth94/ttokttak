import {
  AppSelectMenu,
  type AppSelectMenuOption,
} from "~/shared/ui/app-select-menu";

import type { ScheduleListSortMode } from "../model/schedule-list-entries";

type ScheduleListSortControlProps = {
  onChange: (value: ScheduleListSortMode) => void;
  value: ScheduleListSortMode;
};

const sortOptions: AppSelectMenuOption<ScheduleListSortMode>[] = [
  {
    accessibilityHint: "제목순으로 정렬해요.",
    label: "제목순",
    value: "titleAsc",
  },
  {
    accessibilityHint: "생성순으로 정렬해요.",
    label: "생성순",
    value: "createdDesc",
  },
];

export function ScheduleListSortControl({
  onChange,
  value,
}: ScheduleListSortControlProps): React.JSX.Element {
  const selectedOption = getSortOption(value);

  return (
    <AppSelectMenu
      accessibilityHint="일정 목록 정렬 메뉴를 열어요."
      accessibilityLabel={`정렬: ${selectedOption.label}`}
      align="end"
      options={sortOptions}
      value={selectedOption.value}
      variant="compact"
      onChange={onChange}
    />
  );
}

function getSortOption(value: ScheduleListSortMode): {
  accessibilityHint?: string;
  label: string;
  value: ScheduleListSortMode;
} {
  return (
    sortOptions.find((option) => option.value === value) ?? sortOptions[0]!
  );
}
