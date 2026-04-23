export const notificationQueryKeys = {
  all: ["notifications"] as const,
  inboxItemsPrefix: (userId: string) =>
    ["notifications", "user", userId, "inbox-items"] as const,
  inboxItems: (userId: string, limit?: number) =>
    ["notifications", "user", userId, "inbox-items", limit ?? "all"] as const,
};
