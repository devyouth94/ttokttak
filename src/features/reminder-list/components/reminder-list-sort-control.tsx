import { Pressable, StyleSheet, View } from "react-native";
import * as Select from "@rn-primitives/select";
import { Check, ChevronDown } from "lucide-react-native";

import { AppText } from "~/design-system/components/app-text";
import { borderRadius, color, colors, spacing } from "~/design-system/tokens";

import type { ReminderListSortMode } from "../reminder-list.helpers";

type ReminderListSortControlProps = {
  onChange: (value: ReminderListSortMode) => void;
  value: ReminderListSortMode;
};

const sortOptions: {
  label: string;
  value: ReminderListSortMode;
}[] = [
  { label: "제목순", value: "titleAsc" },
  { label: "생성순", value: "createdDesc" },
];
const SORT_MENU_CONTAINER_PADDING = 4;

export function ReminderListSortControl({
  onChange,
  value,
}: ReminderListSortControlProps): React.JSX.Element {
  const selectedOption = getSortOption(value);

  return (
    <Select.Root
      onValueChange={(nextOption) => {
        const nextSortMode = parseSortMode(nextOption?.value);

        if (nextSortMode) {
          onChange(nextSortMode);
        }
      }}
      value={selectedOption}
    >
      <Select.Trigger asChild>
        <Pressable
          accessibilityHint="일정 목록 정렬 메뉴를 열어요."
          accessibilityLabel={`정렬: ${selectedOption.label}`}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.sortTrigger,
            pressed ? styles.pressed : undefined,
          ]}
        >
          <View style={styles.sortTriggerTextSlot}>
            <AppText
              ellipsizeMode="tail"
              numberOfLines={1}
              style={styles.sortTriggerText}
              variant="label"
            >
              {selectedOption.label}
            </AppText>
          </View>
          <ChevronDown color={color.jetBlack} size={16} />
        </Pressable>
      </Select.Trigger>

      <Select.Portal>
        <Select.Overlay closeOnPress style={styles.sortMenuOverlay} />
        <Select.Content
          align="end"
          avoidCollisions
          insets={{
            bottom: spacing.lg,
            left: spacing.md,
            right: spacing.md,
            top: spacing.lg,
          }}
          side="bottom"
          sideOffset={6}
          style={styles.sortMenuContent}
        >
          {sortOptions.map((option) => (
            <Select.Item
              accessibilityHint={`${option.label}으로 정렬해요.`}
              closeOnPress
              key={option.value}
              label={option.label}
              style={styles.sortMenuItem}
              value={option.value}
            >
              <View style={styles.sortMenuItemTextSlot}>
                <AppText
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  style={styles.sortMenuItemText}
                  variant="label"
                >
                  {option.label}
                </AppText>
              </View>
              <Select.ItemIndicator style={styles.sortMenuIndicator}>
                <Check color={colors.text} size={16} />
              </Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function getSortOption(value: ReminderListSortMode): {
  label: string;
  value: ReminderListSortMode;
} {
  return (
    sortOptions.find((option) => option.value === value) ?? sortOptions[0]!
  );
}

function parseSortMode(value: string | undefined): ReminderListSortMode | null {
  const option = sortOptions.find((candidate) => candidate.value === value);

  return option?.value ?? null;
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.72,
  },
  sortMenuContent: {
    backgroundColor: color.smokyWhite,
    borderRadius: borderRadius.lg,
    minWidth: 180,
    padding: SORT_MENU_CONTAINER_PADDING,
  },
  sortMenuIndicator: {
    alignItems: "center",
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  sortMenuItem: {
    alignItems: "center",
    borderRadius: borderRadius.md,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sortMenuItemText: {
    color: color.jetBlack,
  },
  sortMenuItemTextSlot: {
    flex: 1,
    minWidth: 0,
  },
  sortMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sortTrigger: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "transparent",
    borderColor: color.jetBlack,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: 210,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sortTriggerText: {
    color: color.jetBlack,
  },
  sortTriggerTextSlot: {
    flexShrink: 1,
    minWidth: 0,
  },
});
