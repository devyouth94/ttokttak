export const recurringQueryKeys = {
  all: ["recurring"] as const,
  completionLogs: (userId: string, itemIds: string[]) =>
    [
      "recurring",
      "user",
      userId,
      "completion-logs",
      [...itemIds].sort(),
    ] as const,
  completionLogsInfinite: (userId: string, itemIds: string[]) =>
    [
      "recurring",
      "user",
      userId,
      "completion-logs",
      "infinite",
      [...itemIds].sort(),
    ] as const,
  items: (userId: string, timezone: string) =>
    ["recurring", "user", userId, "items", timezone] as const,
  user: (userId: string) => ["recurring", "user", userId] as const,
};
