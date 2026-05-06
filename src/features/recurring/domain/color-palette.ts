import type { RecurringItemColorKey } from "~/features/recurring/domain/types";

export const recurringItemColorOptions: {
  label: string;
  value: RecurringItemColorKey;
  swatchColor: string;
}[] = [
  { label: "빨강", value: "red", swatchColor: "#F5A3A3" },
  { label: "주황", value: "orange", swatchColor: "#F4BE8A" },
  { label: "노랑", value: "yellow", swatchColor: "#E8D86A" },
  { label: "초록", value: "green", swatchColor: "#9FD4A5" },
  { label: "파랑", value: "blue", swatchColor: "#9DB7F5" },
  { label: "남색", value: "indigo", swatchColor: "#9EA5E8" },
  { label: "보라", value: "purple", swatchColor: "#D4A8EA" },
];

export const recurringItemColorOptionByKey: Record<
  RecurringItemColorKey,
  (typeof recurringItemColorOptions)[number]
> = Object.fromEntries(
  recurringItemColorOptions.map((option) => [option.value, option])
) as Record<RecurringItemColorKey, (typeof recurringItemColorOptions)[number]>;
