import { fromZonedTime } from "date-fns-tz";

import type { Database } from "~/database.types";
import {
  createContentDecryptor,
  decryptContent,
  encryptContent,
} from "~/schedule/content/cipher";
import { nearestColorKey } from "~/schedule/display/color";
import type {
  AnchorType,
  RecurrenceType,
  RuleVersion,
} from "~/schedule/rules/recurrence";
import type { CreateScheduleInput, Schedule } from "~/schedule/schedule";
import { supabase } from "~/supabase";

type ItemRow = Database["public"]["Tables"]["recurring_items"]["Row"];
type VersionRow =
  Database["public"]["Tables"]["recurring_item_schedule_versions"]["Row"];
type Client = typeof supabase;
type ItemWithVersionsRow = ItemRow & {
  recurring_item_schedule_versions?: VersionRow[] | null;
};

type CreateItemInput = CreateScheduleInput & {
  timezone: string;
  userId: string;
};

type UpdateItemInput = {
  edit: {
    item: Pick<CreateScheduleInput, "colorHex" | "description" | "title">;
    version: RuleVersion | null;
  };
  id: string;
  userId: string;
};

const itemSelect = "*, recurring_item_schedule_versions(*)";
const listLimit = 500;
const unrecoverableTitle = "일정 내용을 복구할 수 없어요";

function toVersion(row: VersionRow): RuleVersion {
  return {
    anchorType: row.anchor_type as AnchorType,
    effectiveFromUtc: new Date(row.effective_from_utc).toISOString(),
    endDateLocal: row.end_date_local ?? null,
    intervalValue: row.interval_value,
    notificationsEnabled: row.notifications_enabled,
    recurrenceType: row.recurrence_type as RecurrenceType,
    reminderTimeLocal: row.reminder_time_local.slice(0, 5),
    seedStartDateLocal: row.seed_start_date_local,
    weekdayMask: row.weekday_mask,
  };
}

function getVersions(versions: RuleVersion[]): Schedule["versions"] {
  const [first, ...rest] = versions.sort((left, right) =>
    left.effectiveFromUtc.localeCompare(right.effectiveFromUtc)
  );

  if (!first) {
    throw new Error("반복 규칙 버전을 찾을 수 없습니다.");
  }

  return [first, ...rest];
}

async function toSchedule(
  row: ItemWithVersionsRow,
  decrypt: typeof decryptContent
): Promise<Schedule> {
  const item = {
    colorHex: row.color_hex,
    createdAt: row.created_at,
    id: row.id,
    isArchived: row.is_archived,
    startDateLocal: row.start_date_local,
    versions: getVersions(
      (row.recurring_item_schedule_versions ?? []).map(toVersion)
    ),
  };

  try {
    const content = await decrypt({
      descriptionCiphertext: row.description_ciphertext,
      keyVersion: row.content_key_version,
      metadata: row.content_encryption_metadata,
      titleCiphertext: row.title_ciphertext,
      userId: row.user_id,
    });

    return {
      ...item,
      description: content.description,
      title: content.title,
    };
  } catch {
    return {
      ...item,
      contentStatus: "unrecoverable",
      description: null,
      title: unrecoverableTitle,
    };
  }
}

/** 사용자의 활성 일정을 조회한다. */
export async function listItems(
  input: { userId: string },
  client: Client = supabase
): Promise<Schedule[]> {
  const { data, error } = await client
    .from("recurring_items")
    .select(itemSelect)
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .eq("is_archived", false)
    .limit(listLimit);

  if (error) {
    throw error;
  }

  const decrypt = createContentDecryptor();

  return Promise.all(
    (data as ItemWithVersionsRow[]).map((row) => toSchedule(row, decrypt))
  );
}

/** ID로 일정 하나를 조회한다. */
export async function getItem(
  input: { id: string; userId: string },
  client: Client = supabase
): Promise<Schedule> {
  const { data, error } = await client
    .from("recurring_items")
    .select(itemSelect)
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("반복 항목을 찾을 수 없습니다.");
  }

  return toSchedule(data as ItemWithVersionsRow, decryptContent);
}

/** 새 일정과 초기 규칙 버전을 저장한다. */
export async function createItem(
  input: CreateItemInput,
  client: Client = supabase
): Promise<Schedule> {
  const content = await encryptContent({
    description: input.description ?? null,
    title: input.title,
    userId: input.userId,
  });
  const { data: id, error } = await client.rpc(
    "create_recurring_item_with_initial_version",
    {
      p_anchor_type: input.anchorType,
      p_color_hex: input.colorHex,
      p_color_key: nearestColorKey(input.colorHex),
      p_content_encryption_metadata: content.metadata,
      p_content_key_version: content.keyVersion,
      p_description_ciphertext: content.descriptionCiphertext,
      p_effective_from_utc: fromZonedTime(
        `${input.startDateLocal}T00:00:00.000`,
        input.timezone
      ).toISOString(),
      p_end_date_local: input.endDateLocal,
      p_interval_value: input.intervalValue,
      p_is_archived: false,
      p_notifications_enabled: input.notificationsEnabled,
      p_recurrence_type: input.recurrenceType,
      p_reminder_time_local: input.reminderTimeLocal,
      p_seed_start_date_local: input.startDateLocal,
      p_start_date_local: input.startDateLocal,
      p_title_ciphertext: content.titleCiphertext,
      p_user_id: input.userId,
      p_weekday_mask: input.weekdayMask,
    }
  );

  if (error) {
    throw error;
  }

  return getItem({ id, userId: input.userId }, client);
}

/** 일정 메타와 필요한 경우 새 규칙 버전을 저장한다. */
export async function updateItem(
  input: UpdateItemInput,
  client: Client = supabase
): Promise<Schedule> {
  const { item, version } = input.edit;
  const content = await encryptContent({
    description: item.description ?? null,
    title: item.title,
    userId: input.userId,
  });
  const { error } = await client.rpc("update_recurring_item_with_edit_policy", {
    p_anchor_type: version?.anchorType ?? null,
    p_color_hex: item.colorHex,
    p_color_key: nearestColorKey(item.colorHex),
    p_content_encryption_metadata: content.metadata,
    p_content_key_version: content.keyVersion,
    p_description_ciphertext: content.descriptionCiphertext,
    p_effective_from_utc: version?.effectiveFromUtc ?? null,
    p_end_date_local: version?.endDateLocal ?? null,
    p_has_rule_changes: version !== null,
    p_interval_value: version?.intervalValue ?? null,
    p_is_archived: false,
    p_item_id: input.id,
    p_notifications_enabled: version?.notificationsEnabled ?? null,
    p_recurrence_type: version?.recurrenceType ?? null,
    p_reminder_time_local: version?.reminderTimeLocal ?? null,
    p_seed_start_date_local: version?.seedStartDateLocal ?? null,
    p_title_ciphertext: content.titleCiphertext,
    p_user_id: input.userId,
    p_weekday_mask: version?.weekdayMask ?? null,
  });

  if (error) {
    throw error;
  }

  return getItem({ id: input.id, userId: input.userId }, client);
}

/** 일정을 보관 처리한다. */
export async function archiveItem(
  id: string,
  client: Client = supabase
): Promise<void> {
  const { error } = await client.rpc("archive_recurring_item", {
    p_item_id: id,
  });

  if (error) {
    throw error;
  }
}
