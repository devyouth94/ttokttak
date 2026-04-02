import type {
  RecurringItem,
  RecurringItemDraft,
} from "~/features/recurring/domain/types";
import { validateRecurringItemDraft } from "~/features/recurring/domain/validation";
import {
  getRepositoryClient,
  type RepositoryClient,
} from "~/features/recurring/repositories/repository-client";
import type {
  RecurringItemInsert,
  RecurringItemRow,
  RecurringItemUpdate,
} from "~/lib/database.types";
type RecurringItemPatch = Partial<Omit<RecurringItemDraft, "timezone">>;

export type CreateRecurringItemInput = RecurringItemDraft & {
  userId: string;
};

export type UpdateRecurringItemInput = {
  id: string;
  patch: RecurringItemPatch;
  timezone: string;
  userId: string;
};

export type ListRecurringItemsOptions = {
  client?: RepositoryClient;
  includeArchived?: boolean;
  timezone: string;
  userId: string;
};

export type GetRecurringItemOptions = {
  client?: RepositoryClient;
  id: string;
  timezone: string;
  userId: string;
};

export type ArchiveRecurringItemOptions = {
  client?: RepositoryClient;
  id: string;
  userId: string;
};

function normalizeTimeLocal(value: string): string {
  return value.slice(0, 5);
}

/**
 * DB row를 도메인에서 사용하는 반복 항목 형태로 변환한다.
 * 시간대는 row가 아니라 현재 사용자 프로필 값을 사용한다.
 */
function toRecurringItem(
  row: RecurringItemRow,
  timezone: string
): RecurringItem {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    recurrenceType: row.recurrence_type as RecurringItem["recurrenceType"],
    intervalValue: row.interval_value,
    weekdayMask: row.weekday_mask,
    startDateLocal: row.start_date_local,
    reminderTimeLocal: normalizeTimeLocal(row.reminder_time_local),
    notificationsEnabled: row.notifications_enabled,
    anchorType: row.anchor_type as RecurringItem["anchorType"],
    timezone,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 기존 엔티티를 검증용 draft 형태로 펼친다.
 */
function toRecurringItemDraftFromEntity(
  item: RecurringItem
): RecurringItemDraft {
  return {
    anchorType: item.anchorType,
    category: item.category,
    description: item.description,
    intervalValue: item.intervalValue,
    isArchived: item.isArchived,
    notificationsEnabled: item.notificationsEnabled,
    recurrenceType: item.recurrenceType,
    reminderTimeLocal: item.reminderTimeLocal,
    startDateLocal: item.startDateLocal,
    timezone: item.timezone,
    title: item.title,
    weekdayMask: item.weekdayMask,
  };
}

/**
 * 반복 항목 draft가 문서 기준 검증 규칙을 통과하는지 확인한다.
 */
function assertValidDraft(draft: RecurringItemDraft): void {
  const issues = validateRecurringItemDraft(draft);

  if (issues.length === 0) {
    return;
  }

  throw new Error(issues.map((issue) => issue.message).join(" "));
}

/**
 * 생성용 draft를 recurring_items insert payload로 변환한다.
 */
function toRecurringItemInsert(
  draft: RecurringItemDraft,
  userId: string
): RecurringItemInsert {
  return {
    user_id: userId,
    title: draft.title,
    description: draft.description,
    category: draft.category,
    recurrence_type: draft.recurrenceType,
    interval_value: draft.intervalValue,
    weekday_mask: draft.weekdayMask,
    start_date_local: draft.startDateLocal,
    reminder_time_local: draft.reminderTimeLocal,
    notifications_enabled: draft.notificationsEnabled,
    anchor_type: draft.anchorType,
    is_archived: draft.isArchived,
  };
}

/**
 * 수정 patch를 recurring_items update payload로 변환한다.
 * 시간대는 프로필 값이므로 update 대상에 포함하지 않는다.
 */
function toRecurringItemUpdate(patch: RecurringItemPatch): RecurringItemUpdate {
  const update: RecurringItemUpdate = {};

  if (patch.title !== undefined) {
    update.title = patch.title;
  }

  if (patch.description !== undefined) {
    update.description = patch.description;
  }

  if (patch.category !== undefined) {
    update.category = patch.category;
  }

  if (patch.recurrenceType !== undefined) {
    update.recurrence_type = patch.recurrenceType;
  }

  if (patch.intervalValue !== undefined) {
    update.interval_value = patch.intervalValue;
  }

  if (patch.weekdayMask !== undefined) {
    update.weekday_mask = patch.weekdayMask;
  }

  if (patch.startDateLocal !== undefined) {
    update.start_date_local = patch.startDateLocal;
  }

  if (patch.reminderTimeLocal !== undefined) {
    update.reminder_time_local = patch.reminderTimeLocal;
  }

  if (patch.notificationsEnabled !== undefined) {
    update.notifications_enabled = patch.notificationsEnabled;
  }

  if (patch.anchorType !== undefined) {
    update.anchor_type = patch.anchorType;
  }

  if (patch.isArchived !== undefined) {
    update.is_archived = patch.isArchived;
  }

  return update;
}

/**
 * 현재 사용자의 반복 항목 목록을 조회한다.
 * 기본값은 활성 항목만 반환하고, 필요하면 archive 항목도 함께 포함한다.
 */
export async function listRecurringItems({
  client,
  includeArchived = false,
  timezone,
  userId,
}: ListRecurringItemsOptions): Promise<RecurringItem[]> {
  const supabase = getRepositoryClient(client);
  let query = supabase
    .from("recurring_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!includeArchived) {
    query = query.eq("is_archived", false);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data.map((row) => toRecurringItem(row, timezone));
}

/**
 * 현재 사용자가 소유한 반복 항목 하나를 조회한다.
 */
export async function getRecurringItemById({
  client,
  id,
  timezone,
  userId,
}: GetRecurringItemOptions): Promise<RecurringItem | null> {
  const supabase = getRepositoryClient(client);
  const { data, error } = await supabase
    .from("recurring_items")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toRecurringItem(data, timezone);
}

/**
 * 검증을 통과한 반복 항목을 생성하고, 도메인 형태로 반환한다.
 */
export async function createRecurringItem(
  input: CreateRecurringItemInput,
  client?: RepositoryClient
): Promise<RecurringItem> {
  assertValidDraft(input);

  const supabase = getRepositoryClient(client);
  const { data, error } = await supabase
    .from("recurring_items")
    .insert(toRecurringItemInsert(input, input.userId))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toRecurringItem(data, input.timezone);
}

/**
 * 기존 반복 항목을 부분 수정한다.
 * 수정 전후를 합쳐 다시 검증한 뒤 서버에 저장한다.
 */
export async function updateRecurringItem(
  input: UpdateRecurringItemInput,
  client?: RepositoryClient
): Promise<RecurringItem> {
  const existingItem = await getRecurringItemById({
    client,
    id: input.id,
    timezone: input.timezone,
    userId: input.userId,
  });

  if (!existingItem) {
    throw new Error("반복 항목을 찾을 수 없습니다.");
  }

  const mergedDraft: RecurringItemDraft = {
    ...toRecurringItemDraftFromEntity(existingItem),
    ...input.patch,
    timezone: input.timezone,
  };

  assertValidDraft(mergedDraft);

  const supabase = getRepositoryClient(client);
  const { data, error } = await supabase
    .from("recurring_items")
    .update(toRecurringItemUpdate(input.patch))
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toRecurringItem(data, mergedDraft.timezone);
}

/**
 * 반복 항목을 삭제 대신 archive 상태로 전환한다.
 */
export async function archiveRecurringItem({
  client,
  id,
  userId,
}: ArchiveRecurringItemOptions): Promise<void> {
  const supabase = getRepositoryClient(client);
  const { error } = await supabase
    .from("recurring_items")
    .update({ is_archived: true })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
