import {
  AppSelectMenu,
  type AppSelectMenuOption,
} from "~/shared/ui/app-select-menu";

import type { ReminderListSortMode } from "../reminder-list.helpers";

type ReminderListSortControlProps = {
  onChange: (value: ReminderListSortMode) => void;
  value: ReminderListSortMode;
};

const sortOptions: AppSelectMenuOption<ReminderListSortMode>[] = [
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

export function ReminderListSortControl({
  onChange,
  value,
}: ReminderListSortControlProps): React.JSX.Element {
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

function getSortOption(value: ReminderListSortMode): {
  accessibilityHint?: string;
  label: string;
  value: ReminderListSortMode;
} {
  return (
    sortOptions.find((option) => option.value === value) ?? sortOptions[0]!
  );
}
