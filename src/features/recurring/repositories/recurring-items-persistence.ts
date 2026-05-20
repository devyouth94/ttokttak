import type { RecurringItemContentEncryptionMetadata } from "~/features/privacy/recurring-content-cipher";
import type {
  AnchorType,
  CompletionLog,
  RecurrenceType,
  RecurringItemColorKey,
} from "~/features/recurring/domain/types";
import {
  listCompletionLogsForItem,
  listCompletionLogsForItemHistory,
} from "~/features/recurring/repositories/completion-logs-repository";
import {
  getRepositoryClient,
  type RepositoryClient,
} from "~/features/recurring/repositories/repository-client";

import type {
  RecurringItemRow,
  RecurringItemScheduleVersionRow,
} from "./recurring-database.types";

export type StoredRecurringItemScheduleVersion = {
  anchorType: AnchorType;
  createdAt: string;
  effectiveFromUtc: string;
  endDateLocal: string | null;
  id: string;
  intervalValue: number | null;
  itemId: string;
  notificationsEnabled: boolean;
  recurrenceType: RecurrenceType;
  reminderTimeLocal: string;
  seedStartDateLocal: string;
  userId: string;
  weekdayMask: number[] | null;
};

export type StoredRecurringItem = {
  colorKey: RecurringItemColorKey;
  contentEncryptionMetadata: RecurringItemContentEncryptionMetadata;
  contentKeyVersion: number;
  createdAt: string;
  descriptionCiphertext: string | null;
  id: string;
  isArchived: boolean;
  scheduleVersions: StoredRecurringItemScheduleVersion[];
  startDateLocal: string;
  titleCiphertext: string;
  updatedAt: string;
  userId: string;
};

export type CreateStoredRecurringItemInput = {
  anchorType: AnchorType;
  colorKey: RecurringItemColorKey;
  contentEncryptionMetadata: RecurringItemContentEncryptionMetadata;
  contentKeyVersion: number;
  descriptionCiphertext: string | null;
  effectiveFromUtc: string;
  endDateLocal: string | null;
  intervalValue: number | null;
  isArchived: boolean;
  notificationsEnabled: boolean;
  recurrenceType: RecurrenceType;
  reminderTimeLocal: string;
  seedStartDateLocal: string;
  startDateLocal: string;
  titleCiphertext: string;
  userId: string;
  weekdayMask: number[] | null;
};

export type UpdateStoredRecurringItemInput = {
  anchorType: AnchorType | null;
  colorKey: RecurringItemColorKey;
  contentEncryptionMetadata: RecurringItemContentEncryptionMetadata;
  contentKeyVersion: number;
  descriptionCiphertext: string | null;
  effectiveFromUtc: string | null;
  endDateLocal: string | null;
  hasRuleChanges: boolean;
  intervalValue: number | null;
  isArchived: boolean;
  itemId: string;
  notificationsEnabled: boolean | null;
  recurrenceType: RecurrenceType | null;
  reminderTimeLocal: string | null;
  seedStartDateLocal: string | null;
  titleCiphertext: string;
  userId: string;
  weekdayMask: number[] | null;
};

export type RecurringItemsPersistence = {
  archiveItem: (input: { id: string }) => Promise<void>;
  createItemWithInitialVersion: (
    input: CreateStoredRecurringItemInput
  ) => Promise<string>;
  getItemById: (input: {
    id: string;
    userId: string;
  }) => Promise<StoredRecurringItem>;
  listCompletionLogsForItem: (input: {
    itemId: string;
    userId: string;
  }) => Promise<CompletionLog[]>;
  listCompletionLogsForItemHistory: (input: {
    itemId: string;
    userId: string;
  }) => Promise<CompletionLog[]>;
  listItems: (input: {
    includeArchived: boolean;
    limit: number;
    userId: string;
  }) => Promise<StoredRecurringItem[]>;
  updateItemWithEditPolicy: (
    input: UpdateStoredRecurringItemInput
  ) => Promise<void>;
};

type RecurringItemWithVersionsRow = RecurringItemRow & {
  recurring_item_schedule_versions?: RecurringItemScheduleVersionRow[] | null;
};

const recurringItemSelect = "*, recurring_item_schedule_versions(*)";

function toStoredScheduleVersion(
  row: RecurringItemScheduleVersionRow
): StoredRecurringItemScheduleVersion {
  return {
    anchorType: row.anchor_type as AnchorType,
    createdAt: row.created_at,
    effectiveFromUtc: row.effective_from_utc,
    endDateLocal: row.end_date_local ?? null,
    id: row.id,
    intervalValue: row.interval_value,
    itemId: row.item_id,
    notificationsEnabled: row.notifications_enabled,
    recurrenceType: row.recurrence_type as RecurrenceType,
    reminderTimeLocal: row.reminder_time_local,
    seedStartDateLocal: row.seed_start_date_local,
    userId: row.user_id,
    weekdayMask: row.weekday_mask,
  };
}

function toStoredRecurringItem(
  row: RecurringItemWithVersionsRow
): StoredRecurringItem {
  return {
    colorKey: row.color_key as RecurringItemColorKey,
    contentEncryptionMetadata: row.content_encryption_metadata,
    contentKeyVersion: row.content_key_version,
    createdAt: row.created_at,
    descriptionCiphertext: row.description_ciphertext,
    id: row.id,
    isArchived: row.is_archived,
    scheduleVersions: (row.recurring_item_schedule_versions ?? []).map(
      toStoredScheduleVersion
    ),
    startDateLocal: row.start_date_local,
    titleCiphertext: row.title_ciphertext,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export function createSupabaseRecurringItemsPersistence(
  client?: RepositoryClient
): RecurringItemsPersistence {
  const supabase = getRepositoryClient(client);

  return {
    async archiveItem({ id }) {
      const { error } = await supabase.rpc("archive_recurring_item", {
        p_item_id: id,
      });

      if (error) {
        throw error;
      }
    },

    async createItemWithInitialVersion(input) {
      const { data, error } = await supabase.rpc(
        "create_recurring_item_with_initial_version",
        {
          p_anchor_type: input.anchorType,
          p_color_key: input.colorKey,
          p_content_encryption_metadata: input.contentEncryptionMetadata,
          p_content_key_version: input.contentKeyVersion,
          p_description_ciphertext: input.descriptionCiphertext,
          p_effective_from_utc: input.effectiveFromUtc,
          p_end_date_local: input.endDateLocal,
          p_interval_value: input.intervalValue,
          p_is_archived: input.isArchived,
          p_notifications_enabled: input.notificationsEnabled,
          p_recurrence_type: input.recurrenceType,
          p_reminder_time_local: input.reminderTimeLocal,
          p_seed_start_date_local: input.seedStartDateLocal,
          p_start_date_local: input.startDateLocal,
          p_title_ciphertext: input.titleCiphertext,
          p_user_id: input.userId,
          p_weekday_mask: input.weekdayMask,
        }
      );

      if (error) {
        throw error;
      }

      return data;
    },

    async getItemById({ id, userId }) {
      const { data, error } = await supabase
        .from("recurring_items")
        .select(recurringItemSelect)
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("반복 항목을 찾을 수 없습니다.");
      }

      return toStoredRecurringItem(data as RecurringItemWithVersionsRow);
    },

    listCompletionLogsForItem(input) {
      return listCompletionLogsForItem({
        client,
        itemId: input.itemId,
        userId: input.userId,
      });
    },

    listCompletionLogsForItemHistory(input) {
      return listCompletionLogsForItemHistory({
        client,
        itemId: input.itemId,
        userId: input.userId,
      });
    },

    async listItems({ includeArchived, limit, userId }) {
      let query = supabase
        .from("recurring_items")
        .select(recurringItemSelect)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!includeArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query.limit(limit);

      if (error) {
        throw error;
      }

      return (data as RecurringItemWithVersionsRow[]).map(
        toStoredRecurringItem
      );
    },

    async updateItemWithEditPolicy(input) {
      const { error } = await supabase.rpc(
        "update_recurring_item_with_edit_policy",
        {
          p_anchor_type: input.anchorType,
          p_color_key: input.colorKey,
          p_content_encryption_metadata: input.contentEncryptionMetadata,
          p_content_key_version: input.contentKeyVersion,
          p_description_ciphertext: input.descriptionCiphertext,
          p_effective_from_utc: input.effectiveFromUtc,
          p_end_date_local: input.endDateLocal,
          p_has_rule_changes: input.hasRuleChanges,
          p_interval_value: input.intervalValue,
          p_is_archived: input.isArchived,
          p_item_id: input.itemId,
          p_notifications_enabled: input.notificationsEnabled,
          p_recurrence_type: input.recurrenceType,
          p_reminder_time_local: input.reminderTimeLocal,
          p_seed_start_date_local: input.seedStartDateLocal,
          p_title_ciphertext: input.titleCiphertext,
          p_user_id: input.userId,
          p_weekday_mask: input.weekdayMask,
        }
      );

      if (error) {
        throw error;
      }
    },
  };
}
