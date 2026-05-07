import { fromZonedTime } from "date-fns-tz";

import {
  recurringContentCipher,
  type RecurringItemContentCipher,
} from "~/features/privacy/recurring-content-cipher";
import {
  type RecurringItemEditPatch,
  resolveRecurringItemEditPolicy,
} from "~/features/recurring/domain/recurring-item-edit-policy";
import type {
  RecurringItem,
  RecurringItemColorKey,
  RecurringItemDraft,
  RecurringItemScheduleVersion,
} from "~/features/recurring/domain/types";
import { defaultRecurringItemColorKey } from "~/features/recurring/domain/types";
import { validateRecurringItemDraft } from "~/features/recurring/domain/validation";
import { listCompletionLogsForItem } from "~/features/recurring/repositories/completion-logs-repository";
import {
  getRepositoryClient,
  type RepositoryClient,
} from "~/features/recurring/repositories/repository-client";
import type {
  RecurringItemRow,
  RecurringItemScheduleVersionRow,
} from "~/lib/database.types";

type RecurringItemPatch = RecurringItemEditPatch;

type RecurringItemWithVersionsRow = RecurringItemRow & {
  recurring_item_schedule_versions?: RecurringItemScheduleVersionRow[] | null;
};

type RecurringItemRepositoryOptions = {
  client?: RepositoryClient;
  contentCipher?: RecurringItemContentCipher;
};

const recurringItemSelect = "*, recurring_item_schedule_versions(*)";
const unrecoverableRecurringItemTitle = "일정 내용을 복구할 수 없어요";

export type CreateRecurringItemInput = Omit<RecurringItemDraft, "colorKey"> & {
  colorKey?: RecurringItemColorKey;
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
  contentCipher?: RecurringItemContentCipher;
  includeArchived?: boolean;
  timezone: string;
  userId: string;
};

export type GetRecurringItemOptions = {
  client?: RepositoryClient;
  contentCipher?: RecurringItemContentCipher;
  id: string;
  timezone: string;
  userId: string;
};

export type ArchiveRecurringItemOptions = {
  client?: RepositoryClient;
  id: string;
  userId: string;
};

function resolveRepositoryOptions(
  clientOrOptions?: RepositoryClient | RecurringItemRepositoryOptions
): RecurringItemRepositoryOptions {
  if (isRecurringItemRepositoryOptions(clientOrOptions)) {
    return clientOrOptions;
  }

  return {
    client: clientOrOptions,
  };
}

function isRecurringItemRepositoryOptions(
  value?: RepositoryClient | RecurringItemRepositoryOptions
): value is RecurringItemRepositoryOptions {
  return Boolean(
    value &&
    typeof value === "object" &&
    ("client" in value || "contentCipher" in value)
  );
}

function normalizeTimeLocal(value: string): string {
  return value.slice(0, 5);
}

function toScheduleVersion(
  row: RecurringItemScheduleVersionRow
): RecurringItemScheduleVersion {
  return {
    id: row.id,
    itemId: row.item_id,
    userId: row.user_id,
    effectiveFromUtc: new Date(row.effective_from_utc).toISOString(),
    recurrenceType: row.recurrence_type as RecurringItem["recurrenceType"],
    intervalValue: row.interval_value,
    weekdayMask: row.weekday_mask,
    reminderTimeLocal: normalizeTimeLocal(row.reminder_time_local),
    anchorType: row.anchor_type as RecurringItem["anchorType"],
    seedStartDateLocal: row.seed_start_date_local,
    notificationsEnabled: row.notifications_enabled,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function getSortedScheduleVersions(
  row: RecurringItemWithVersionsRow
): RecurringItemScheduleVersion[] {
  return (row.recurring_item_schedule_versions ?? [])
    .map(toScheduleVersion)
    .sort((left, right) =>
      left.effectiveFromUtc.localeCompare(right.effectiveFromUtc)
    );
}

function getLatestScheduleVersion(
  row: RecurringItemWithVersionsRow
): RecurringItemScheduleVersion {
  const versions = getSortedScheduleVersions(row);
  const latestVersion = versions[versions.length - 1];

  if (!latestVersion) {
    throw new Error("반복 규칙 버전을 찾을 수 없습니다.");
  }

  return latestVersion;
}

/**
 * DB row를 도메인에서 사용하는 반복 항목 형태로 변환한다.
 * 현재 규칙 표시는 latest schedule version 기준으로 계산한다.
 */
async function toRecurringItem(
  row: RecurringItemWithVersionsRow,
  contentCipher: RecurringItemContentCipher,
  timezone: string
): Promise<RecurringItem> {
  const latestVersion = getLatestScheduleVersion(row);
  const scheduleVersions = getSortedScheduleVersions(row);
  const content = await decryptRecurringItemContentWithFallback({
    contentCipher,
    row,
  });

  return {
    id: row.id,
    userId: row.user_id,
    title: content.title,
    description: content.description,
    contentStatus: content.contentStatus,
    category: row.category,
    colorKey: row.color_key as RecurringItemColorKey,
    recurrenceType: latestVersion.recurrenceType,
    intervalValue: latestVersion.intervalValue,
    weekdayMask: latestVersion.weekdayMask,
    startDateLocal: row.start_date_local,
    reminderTimeLocal: latestVersion.reminderTimeLocal,
    notificationsEnabled: latestVersion.notificationsEnabled,
    anchorType: latestVersion.anchorType,
    timezone,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scheduleVersions,
  };
}

async function decryptRecurringItemContentWithFallback({
  contentCipher,
  row,
}: {
  contentCipher: RecurringItemContentCipher;
  row: RecurringItemWithVersionsRow;
}): Promise<Pick<RecurringItem, "contentStatus" | "description" | "title">> {
  try {
    return {
      ...(await contentCipher.decryptRecurringItemContent({
        descriptionCiphertext: row.description_ciphertext,
        keyVersion: row.content_key_version,
        metadata: row.content_encryption_metadata,
        titleCiphertext: row.title_ciphertext,
        userId: row.user_id,
      })),
      contentStatus: {
        status: "available",
      },
    };
  } catch {
    return {
      contentStatus: {
        reason: "decryption-failed",
        status: "unrecoverable",
      },
      description: null,
      title: unrecoverableRecurringItemTitle,
    };
  }
}

function assertValidDraft(draft: RecurringItemDraft): void {
  const issues = validateRecurringItemDraft(draft);

  if (issues.length === 0) {
    return;
  }

  throw new Error(issues.map((issue) => issue.message).join(" "));
}

async function getRecurringItemRowById(params: {
  client?: RepositoryClient;
  id: string;
  userId: string;
}): Promise<RecurringItemWithVersionsRow> {
  const supabase = getRepositoryClient(params.client);
  const { data, error } = await supabase
    .from("recurring_items")
    .select(recurringItemSelect)
    .eq("id", params.id)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("반복 항목을 찾을 수 없습니다.");
  }

  return data as RecurringItemWithVersionsRow;
}

export async function listRecurringItems({
  client,
  contentCipher = recurringContentCipher,
  includeArchived = false,
  timezone,
  userId,
}: ListRecurringItemsOptions): Promise<RecurringItem[]> {
  const supabase = getRepositoryClient(client);
  let query = supabase
    .from("recurring_items")
    .select(recurringItemSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!includeArchived) {
    query = query.eq("is_archived", false);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return Promise.all(
    (data as RecurringItemWithVersionsRow[]).map((row) =>
      toRecurringItem(row, contentCipher, timezone)
    )
  );
}

export async function getRecurringItemById({
  client,
  contentCipher = recurringContentCipher,
  id,
  timezone,
  userId,
}: GetRecurringItemOptions): Promise<RecurringItem> {
  return toRecurringItem(
    await getRecurringItemRowById({
      client,
      id,
      userId,
    }),
    contentCipher,
    timezone
  );
}

export async function createRecurringItem(
  input: CreateRecurringItemInput,
  clientOrOptions?: RepositoryClient | RecurringItemRepositoryOptions
): Promise<RecurringItem> {
  const { client, contentCipher = recurringContentCipher } =
    resolveRepositoryOptions(clientOrOptions);
  const colorKey = input.colorKey ?? defaultRecurringItemColorKey;
  const draft = {
    ...input,
    colorKey,
  };

  assertValidDraft(draft);

  const supabase = getRepositoryClient(client);
  const effectiveFromUtc = fromZonedTime(
    `${input.startDateLocal}T00:00:00.000`,
    input.timezone
  ).toISOString();
  const encryptedContent = await contentCipher.encryptRecurringItemContent({
    description: input.description ?? null,
    title: input.title,
    userId: input.userId,
  });
  const { data, error } = await supabase.rpc(
    "create_recurring_item_with_initial_version",
    {
      p_anchor_type: input.anchorType,
      p_category: input.category ?? null,
      p_color_key: colorKey,
      p_content_encryption_metadata: encryptedContent.metadata,
      p_content_key_version: encryptedContent.keyVersion,
      p_description_ciphertext: encryptedContent.descriptionCiphertext,
      p_effective_from_utc: effectiveFromUtc,
      p_interval_value: input.intervalValue ?? null,
      p_is_archived: input.isArchived,
      p_notifications_enabled: input.notificationsEnabled,
      p_recurrence_type: input.recurrenceType,
      p_reminder_time_local: input.reminderTimeLocal,
      p_seed_start_date_local: input.startDateLocal,
      p_start_date_local: input.startDateLocal,
      p_title_ciphertext: encryptedContent.titleCiphertext,
      p_user_id: input.userId,
      p_weekday_mask: input.weekdayMask ?? null,
    }
  );

  if (error) {
    throw error;
  }

  return getRecurringItemById({
    client,
    contentCipher,
    id: data,
    timezone: input.timezone,
    userId: input.userId,
  });
}

export async function updateRecurringItem(
  input: UpdateRecurringItemInput,
  clientOrOptions?: RepositoryClient | RecurringItemRepositoryOptions
): Promise<RecurringItem> {
  const { client, contentCipher = recurringContentCipher } =
    resolveRepositoryOptions(clientOrOptions);
  const existingItem = await getRecurringItemById({
    client,
    contentCipher,
    id: input.id,
    timezone: input.timezone,
    userId: input.userId,
  });

  if (existingItem.contentStatus?.status === "unrecoverable") {
    throw new Error("내용을 복구할 수 없는 일정은 수정할 수 없습니다.");
  }

  const editNow = new Date();
  const policyWithoutLogs = resolveRecurringItemEditPolicy({
    item: existingItem,
    now: () => editNow,
    patch: input.patch,
    timezone: input.timezone,
  });
  const policy = policyWithoutLogs.ruleChanged
    ? resolveRecurringItemEditPolicy({
        completionLogs: await listCompletionLogsForItem({
          client,
          itemId: input.id,
          userId: input.userId,
        }),
        item: existingItem,
        now: () => editNow,
        patch: input.patch,
        timezone: input.timezone,
      })
    : policyWithoutLogs;
  const { hasAnyChanges, mergedDraft, ruleChanged } = policy;
  const supabase = getRepositoryClient(client);

  if (hasAnyChanges) {
    const encryptedContent = await contentCipher.encryptRecurringItemContent({
      description: mergedDraft.description ?? null,
      title: mergedDraft.title,
      userId: input.userId,
    });
    const { error } = await supabase.rpc(
      "update_recurring_item_with_edit_policy",
      {
        p_anchor_type: ruleChanged ? mergedDraft.anchorType : null,
        p_category: mergedDraft.category ?? null,
        p_color_key: mergedDraft.colorKey,
        p_content_encryption_metadata: encryptedContent.metadata,
        p_content_key_version: encryptedContent.keyVersion,
        p_description_ciphertext: encryptedContent.descriptionCiphertext,
        p_effective_from_utc: policy.effectiveFromUtc,
        p_has_rule_changes: ruleChanged,
        p_interval_value: ruleChanged
          ? (mergedDraft.intervalValue ?? null)
          : null,
        p_is_archived: mergedDraft.isArchived,
        p_item_id: input.id,
        p_notifications_enabled: ruleChanged
          ? mergedDraft.notificationsEnabled
          : null,
        p_recurrence_type: ruleChanged ? mergedDraft.recurrenceType : null,
        p_reminder_time_local: ruleChanged
          ? mergedDraft.reminderTimeLocal
          : null,
        p_seed_start_date_local: policy.seedStartDateLocal,
        p_title_ciphertext: encryptedContent.titleCiphertext,
        p_user_id: input.userId,
        p_weekday_mask: ruleChanged ? (mergedDraft.weekdayMask ?? null) : null,
      }
    );

    if (error) {
      throw error;
    }
  }

  return getRecurringItemById({
    client,
    contentCipher,
    id: input.id,
    timezone: input.timezone,
    userId: input.userId,
  });
}

export async function archiveRecurringItem({
  client,
  id,
}: ArchiveRecurringItemOptions): Promise<void> {
  const supabase = getRepositoryClient(client);
  const { error } = await supabase.rpc("archive_recurring_item", {
    p_item_id: id,
  });

  if (error) {
    throw error;
  }
}
