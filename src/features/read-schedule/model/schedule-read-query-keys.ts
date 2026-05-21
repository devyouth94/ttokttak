export const scheduleReadQueryKeys = {
  all: ["schedule-read"] as const,
  completionLogs: (
    userId: string,
    itemIds: string[],
    anchorItemIds?: string[],
    rangeStartUtc?: string,
    rangeEndUtc?: string
  ) =>
    [
      "schedule-read",
      "user",
      userId,
      "completion-logs",
      [...itemIds].sort(),
      [...(anchorItemIds ?? [])].sort(),
      rangeStartUtc ?? "all-start",
      rangeEndUtc ?? "all-end",
    ] as const,
  completionLogsForItem: (userId: string, itemId: string) =>
    [
      "schedule-read",
      "user",
      userId,
      "completion-logs",
      "item",
      itemId,
    ] as const,
  item: (userId: string, timezone: string, itemId: string) =>
    ["schedule-read", "user", userId, "items", timezone, itemId] as const,
  items: (userId: string, timezone: string) =>
    ["schedule-read", "user", userId, "items", timezone] as const,
  user: (userId: string) => ["schedule-read", "user", userId] as const,
};
