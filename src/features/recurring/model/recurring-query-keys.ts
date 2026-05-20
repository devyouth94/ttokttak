export const recurringQueryKeys = {
  all: ["recurring"] as const,
  completionLogs: (
    userId: string,
    itemIds: string[],
    anchorItemIds?: string[],
    rangeStartUtc?: string,
    rangeEndUtc?: string
  ) =>
    [
      "recurring",
      "user",
      userId,
      "completion-logs",
      [...itemIds].sort(),
      [...(anchorItemIds ?? [])].sort(),
      rangeStartUtc ?? "all-start",
      rangeEndUtc ?? "all-end",
    ] as const,
  completionLogsForItem: (userId: string, itemId: string) =>
    ["recurring", "user", userId, "completion-logs", "item", itemId] as const,
  item: (userId: string, timezone: string, itemId: string) =>
    ["recurring", "user", userId, "items", timezone, itemId] as const,
  items: (userId: string, timezone: string) =>
    ["recurring", "user", userId, "items", timezone] as const,
  user: (userId: string) => ["recurring", "user", userId] as const,
};
