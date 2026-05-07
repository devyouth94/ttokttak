export type NotificationSyncReason =
  | "app-foregrounded"
  | "notification-tapped"
  | "session-restored"
  | "item-archived"
  | "item-created"
  | "item-updated"
  | "occurrence-completed"
  | "occurrence-skipped";

export type NotificationSyncScope =
  | {
      type: "all";
    }
  | {
      effectiveFromUtc: string;
      itemId: string;
      type: "item";
    };
