export type NotificationDeliverySyncReason =
  | "item-archived"
  | "item-created"
  | "item-updated"
  | "occurrence-completed"
  | "occurrence-skipped";

export type NotificationDeliverySyncScope =
  | {
      type: "all";
    }
  | {
      effectiveFromUtc: string;
      itemId: string;
      type: "item";
    };
