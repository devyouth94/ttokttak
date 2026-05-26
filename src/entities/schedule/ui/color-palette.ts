import type { AppLanguage } from "~/shared/i18n";

import type { RecurringItemColorKey } from "../model/types";

type RecurringItemColorOption<Key extends RecurringItemColorKey> = {
  label: string;
  value: Key;
  swatchColor: string;
};

type RecurringItemColorOptionByKey = {
  [Key in RecurringItemColorKey]: RecurringItemColorOption<Key>;
};

export const recurringItemColorOptionByKey = {
  red: { label: "빨강", value: "red", swatchColor: "#F5A3A3" },
  orange: { label: "주황", value: "orange", swatchColor: "#F4BE8A" },
  yellow: { label: "노랑", value: "yellow", swatchColor: "#E8D86A" },
  green: { label: "초록", value: "green", swatchColor: "#9FD4A5" },
  blue: { label: "파랑", value: "blue", swatchColor: "#9DB7F5" },
  indigo: { label: "남색", value: "indigo", swatchColor: "#9EA5E8" },
  purple: { label: "보라", value: "purple", swatchColor: "#D4A8EA" },
} satisfies RecurringItemColorOptionByKey;

export const recurringItemColorOptions = Object.values(
  recurringItemColorOptionByKey
);

const englishRecurringItemColorLabelByKey = {
  blue: "Blue",
  green: "Green",
  indigo: "Indigo",
  orange: "Orange",
  purple: "Purple",
  red: "Red",
  yellow: "Yellow",
} as const satisfies Record<RecurringItemColorKey, string>;

const recurringItemColorLabelByLanguage = {
  en: englishRecurringItemColorLabelByKey,
  ko: Object.fromEntries(
    Object.entries(recurringItemColorOptionByKey).map(([key, option]) => [
      key,
      option.label,
    ])
  ),
} as Record<AppLanguage, Record<RecurringItemColorKey, string>>;

export function getRecurringItemColorLabel(
  colorKey: RecurringItemColorKey,
  language: AppLanguage = "ko"
): string {
  return recurringItemColorLabelByLanguage[language][colorKey];
}

export function getRecurringItemColorOptions(language: AppLanguage = "ko") {
  return recurringItemColorOptions.map((option) => ({
    ...option,
    label: getRecurringItemColorLabel(option.value, language),
  }));
}
