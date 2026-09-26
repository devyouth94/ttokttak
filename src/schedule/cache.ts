import { queryClient } from "~/query-client";

const scheduleRootKey = ["schedule"] as const;

export function activeScheduleDataKey(userId: string) {
  return [...scheduleUserKey(userId), "active-data"] as const;
}

export function scheduleItemKey(userId: string, itemId: string | null) {
  return [...scheduleUserKey(userId), "item", itemId] as const;
}

export function scheduleDetailKey(userId: string, itemId: string | null) {
  return [...scheduleUserKey(userId), "detail", itemId] as const;
}

/** 한 사용자의 활성 목록·단건·상세 일정 캐시를 모두 무효화한다. */
export async function invalidateScheduleCache(userId: string): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: scheduleUserKey(userId) });
}

function scheduleUserKey(userId: string) {
  return [...scheduleRootKey, userId] as const;
}
