import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { SelectMenu, type SelectOption } from "~/ui/select-menu";
import { spacing } from "~/ui/tokens";

import type { Sort } from "../list";

type ListSortMenuProps = {
  onChange: (value: Sort) => void;
  value: Sort;
};

export function ListSortMenu({
  onChange,
  value,
}: ListSortMenuProps): React.JSX.Element {
  const { t } = useTranslation();

  const options: SelectOption<Sort>[] = [
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

  const selected = options.find((option) => option.value === value)!;

  return (
    <View style={styles.container}>
      <SelectMenu
        accessibilityHint={t("scheduleList.sort.menuHint")}
        accessibilityLabel={t("scheduleList.sort.menuLabel", {
          label: selected.label,
        })}
        options={options}
        value={selected.value}
        onChange={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
});
