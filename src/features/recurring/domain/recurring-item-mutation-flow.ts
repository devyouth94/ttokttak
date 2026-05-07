import type {
  NotificationSyncReason,
  NotificationSyncScope,
} from "~/features/notifications/notification-sync.types";
import type { RecurringItemDraft } from "~/features/recurring/domain/types";

type RecurringItemMutationPatch = Partial<Omit<RecurringItemDraft, "timezone">>;

type RecurringItemMutationResult = {
  itemId: string;
};

type RecurringItemMutationFlowInput = {
  archiveRecurringItem?: (input: {
    id: string;
    userId: string;
  }) => Promise<unknown>;
  createRecurringItem?: (
    input: RecurringItemDraft & { userId: string }
  ) => Promise<{
    id: string;
  }>;
  invalidateRecurringUserQueries: (userId: string) => Promise<unknown>;
  mutation:
    | {
        draft: RecurringItemDraft;
        type: "create";
        userId: string;
      }
    | {
        itemId: string;
        patch: RecurringItemMutationPatch;
        timezone: string;
        type: "update";
        userId: string;
      }
    | {
        itemId: string;
        type: "archive";
        userId: string;
      };
  now: () => Date;
  syncAfterMutation: (params: {
    reason: NotificationSyncReason;
    scope: NotificationSyncScope;
  }) => Promise<unknown>;
  updateRecurringItem?: (input: {
    id: string;
    patch: RecurringItemMutationPatch;
    timezone: string;
    userId: string;
  }) => Promise<unknown>;
};

export async function processRecurringItemMutationFlow({
  archiveRecurringItem,
  createRecurringItem,
  invalidateRecurringUserQueries,
  mutation,
  now,
  syncAfterMutation,
  updateRecurringItem,
}: RecurringItemMutationFlowInput): Promise<RecurringItemMutationResult> {
  const effectiveFromUtc = now().toISOString();
  let itemId: string;
  let reason: NotificationSyncReason;

  if (mutation.type === "create") {
    if (!createRecurringItem) {
      throw new Error("일정 생성 어댑터를 찾을 수 없습니다.");
    }

    const createdItem = await createRecurringItem({
      ...mutation.draft,
      userId: mutation.userId,
    });

    itemId = createdItem.id;
    reason = "item-created";
  } else if (mutation.type === "update") {
    if (!updateRecurringItem) {
      throw new Error("일정 수정 어댑터를 찾을 수 없습니다.");
    }

    await updateRecurringItem({
      id: mutation.itemId,
      patch: mutation.patch,
      timezone: mutation.timezone,
      userId: mutation.userId,
    });

    itemId = mutation.itemId;
    reason = "item-updated";
  } else {
    if (!archiveRecurringItem) {
      throw new Error("일정 삭제 어댑터를 찾을 수 없습니다.");
    }

    await archiveRecurringItem({
      id: mutation.itemId,
      userId: mutation.userId,
    });

    itemId = mutation.itemId;
    reason = "item-archived";
  }

  await syncAfterMutation({
    reason,
    scope: {
      effectiveFromUtc,
      itemId,
      type: "item",
    },
  });

  await invalidateRecurringUserQueries(mutation.userId);

  return {
    itemId,
  };
}
