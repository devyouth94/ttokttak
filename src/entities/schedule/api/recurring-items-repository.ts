import { fromZonedTime } from "date-fns-tz";

import { type RepositoryClient } from "~/shared/api/repository-client";

import {
  recurringContentCipher,
  type RecurringItemContentCipher,
} from "./recurring-content-cipher";
import {
  createSupabaseRecurringItemsPersistence,
  type RecurringItemsPersistence,
  type StoredRecurringItem,
  type StoredRecurringItemScheduleVersion,
} from "./recurring-items-persistence";
import type { RecurringItemEditPatch } from "../model/edit-policy";
import { resolveRecurringItemEditPolicy } from "../model/edit-policy";
import type {
  RecurringItem,
  RecurringItemColorKey,
  RecurringItemDraft,
  RecurringItemScheduleVersion,
} from "../model/types";
import { defaultRecurringItemColorKey } from "../model/types";
import { validateRecurringItemDraft } from "../model/validation";

type RecurringItemPatch = RecurringItemEditPatch;

type RecurringItemRepositoryOptions = {
  client?: RepositoryClient;
  contentCipher?: RecurringItemContentCipher;
  persistence?: RecurringItemsPersistence;
};

const unrecoverableRecurringItemTitle = "일정 내용을 복구할 수 없어요";
const recurringItemsListLimit = 500;

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
  persistence?: RecurringItemsPersistence;
  timezone: string;
  userId: string;
};

export type GetRecurringItemOptions = {
  client?: RepositoryClient;
  contentCipher?: RecurringItemContentCipher;
  id: string;
  persistence?: RecurringItemsPersistence;
  timezone: string;
  userId: string;
};

export type ArchiveRecurringItemOptions = {
  client?: RepositoryClient;
  id: string;
  persistence?: RecurringItemsPersistence;
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
    ("client" in value || "contentCipher" in value || "persistence" in value)
  );
}

function resolveRecurringItemsPersistence({
  client,
  persistence,
}: RecurringItemRepositoryOptions): RecurringItemsPersistence {
  return persistence ?? createSupabaseRecurringItemsPersistence(client);
}

function normalizeTimeLocal(value: string): string {
  return value.slice(0, 5);
}

function resolveStoredEndDateLocal(
  draft: RecurringItemDraft,
  ruleChanged: boolean
): string | null {
  if (!ruleChanged || draft.recurrenceType === "once") {
    return null;
  }

  return draft.endDateLocal ?? null;
}

function toScheduleVersion(
  row: StoredRecurringItemScheduleVersion
): RecurringItemScheduleVersion {
  return {
    id: row.id,
    itemId: row.itemId,
    userId: row.userId,
    effectiveFromUtc: new Date(row.effectiveFromUtc).toISOString(),
    endDateLocal: row.endDateLocal ?? null,
    recurrenceType: row.recurrenceType,
    intervalValue: row.intervalValue,
    weekdayMask: row.weekdayMask,
    reminderTimeLocal: normalizeTimeLocal(row.reminderTimeLocal),
    anchorType: row.anchorType,
    seedStartDateLocal: row.seedStartDateLocal,
    notificationsEnabled: row.notificationsEnabled,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

function getSortedScheduleVersions(
  row: StoredRecurringItem
): RecurringItem["scheduleVersions"] {
  const [firstVersion, ...remainingVersions] = row.scheduleVersions
    .map(toScheduleVersion)
    .sort((left, right) =>
      left.effectiveFromUtc.localeCompare(right.effectiveFromUtc)
    );

  if (!firstVersion) {
    throw new Error("반복 규칙 버전을 찾을 수 없습니다.");
  }

  return [firstVersion, ...remainingVersions];
}

/**
 * DB row를 도메인에서 사용하는 반복 항목 형태로 변환한다.
 * 현재 규칙 표시는 latest schedule version 기준으로 계산한다.
 */
async function toRecurringItem(
  row: StoredRecurringItem,
  contentCipher: RecurringItemContentCipher,
  timezone: string
): Promise<RecurringItem> {
  const scheduleVersions = getSortedScheduleVersions(row);
  const content = await decryptRecurringItemContentWithFallback({
    contentCipher,
    row,
  });

  return {
    id: row.id,
    userId: row.userId,
    title: content.title,
    description: content.description,
    contentStatus: content.contentStatus,
    colorKey: row.colorKey,
    startDateLocal: row.startDateLocal,
    timezone,
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    scheduleVersions,
  };
}

async function decryptRecurringItemContentWithFallback({
  contentCipher,
  row,
}: {
  contentCipher: RecurringItemContentCipher;
  row: StoredRecurringItem;
}): Promise<Pick<RecurringItem, "contentStatus" | "description" | "title">> {
  try {
    return {
      ...(await contentCipher.decryptRecurringItemContent({
        descriptionCiphertext: row.descriptionCiphertext,
        keyVersion: row.contentKeyVersion,
        metadata: row.contentEncryptionMetadata,
        titleCiphertext: row.titleCiphertext,
        userId: row.userId,
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

async function getRecurringItemByIdFromPersistence(params: {
  id: string;
  persistence: RecurringItemsPersistence;
  userId: string;
}): Promise<StoredRecurringItem> {
  return params.persistence.getItemById({
    id: params.id,
    userId: params.userId,
  });
}

export async function listRecurringItems({
  client,
  contentCipher = recurringContentCipher,
  includeArchived = false,
  persistence: providedPersistence,
  timezone,
  userId,
}: ListRecurringItemsOptions): Promise<RecurringItem[]> {
  const persistence = resolveRecurringItemsPersistence({
    client,
    persistence: providedPersistence,
  });
  const items = await persistence.listItems({
    includeArchived,
    limit: recurringItemsListLimit,
    userId,
  });

  return Promise.all(
    items.map((item) => toRecurringItem(item, contentCipher, timezone))
  );
}

export async function getRecurringItemById({
  client,
  contentCipher = recurringContentCipher,
  id,
  persistence: providedPersistence,
  timezone,
  userId,
}: GetRecurringItemOptions): Promise<RecurringItem> {
  const persistence = resolveRecurringItemsPersistence({
    client,
    persistence: providedPersistence,
  });

  return toRecurringItem(
    await getRecurringItemByIdFromPersistence({
      id,
      persistence,
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
  const {
    client,
    contentCipher = recurringContentCipher,
    persistence: providedPersistence,
  } = resolveRepositoryOptions(clientOrOptions);
  const persistence = resolveRecurringItemsPersistence({
    client,
    persistence: providedPersistence,
  });
  const colorKey = input.colorKey ?? defaultRecurringItemColorKey;
  const draft = {
    ...input,
    colorKey,
    endDateLocal:
      input.recurrenceType === "once" ? null : (input.endDateLocal ?? null),
  };

  assertValidDraft(draft);

  const effectiveFromUtc = fromZonedTime(
    `${input.startDateLocal}T00:00:00.000`,
    input.timezone
  ).toISOString();
  const encryptedContent = await contentCipher.encryptRecurringItemContent({
    description: input.description ?? null,
    title: input.title,
    userId: input.userId,
  });
  const itemId = await persistence.createItemWithInitialVersion({
    anchorType: input.anchorType,
    colorKey,
    contentEncryptionMetadata: encryptedContent.metadata,
    contentKeyVersion: encryptedContent.keyVersion,
    descriptionCiphertext: encryptedContent.descriptionCiphertext,
    effectiveFromUtc,
    endDateLocal: resolveStoredEndDateLocal(draft, true),
    intervalValue: draft.intervalValue ?? null,
    isArchived: draft.isArchived,
    notificationsEnabled: draft.notificationsEnabled,
    recurrenceType: draft.recurrenceType,
    reminderTimeLocal: draft.reminderTimeLocal,
    seedStartDateLocal: input.startDateLocal,
    startDateLocal: draft.startDateLocal,
    titleCiphertext: encryptedContent.titleCiphertext,
    userId: input.userId,
    weekdayMask: draft.weekdayMask ?? null,
  });

  return getRecurringItemById({
    contentCipher,
    id: itemId,
    persistence,
    timezone: input.timezone,
    userId: input.userId,
  });
}

export async function updateRecurringItem(
  input: UpdateRecurringItemInput,
  clientOrOptions?: RepositoryClient | RecurringItemRepositoryOptions
): Promise<RecurringItem> {
  const {
    client,
    contentCipher = recurringContentCipher,
    persistence: providedPersistence,
  } = resolveRepositoryOptions(clientOrOptions);
  const persistence = resolveRecurringItemsPersistence({
    client,
    persistence: providedPersistence,
  });
  const existingItem = await getRecurringItemById({
    contentCipher,
    id: input.id,
    persistence,
    timezone: input.timezone,
    userId: input.userId,
  });

  if (existingItem.contentStatus?.status === "unrecoverable") {
    throw new Error("내용을 복구할 수 없는 일정은 수정할 수 없습니다.");
  }

  const editNow = new Date();
  const policy = resolveRecurringItemEditPolicy({
    completionLogs: await persistence.listCompletionLogsForItem({
      itemId: input.id,
      userId: input.userId,
    }),
    item: existingItem,
    now: () => editNow,
    patch: input.patch,
    timezone: input.timezone,
  });
  const { hasAnyChanges, itemPatch, scheduleVersionCommand } = policy;

  if (hasAnyChanges) {
    const encryptedContent = await contentCipher.encryptRecurringItemContent({
      description: itemPatch.description ?? null,
      title: itemPatch.title,
      userId: input.userId,
    });
    await persistence.updateItemWithEditPolicy({
      anchorType: scheduleVersionCommand?.anchorType ?? null,
      colorKey: itemPatch.colorKey,
      contentEncryptionMetadata: encryptedContent.metadata,
      contentKeyVersion: encryptedContent.keyVersion,
      descriptionCiphertext: encryptedContent.descriptionCiphertext,
      effectiveFromUtc: scheduleVersionCommand?.effectiveFromUtc ?? null,
      hasRuleChanges: scheduleVersionCommand !== null,
      intervalValue: scheduleVersionCommand?.intervalValue ?? null,
      endDateLocal: scheduleVersionCommand?.endDateLocal ?? null,
      isArchived: itemPatch.isArchived,
      itemId: input.id,
      notificationsEnabled:
        scheduleVersionCommand?.notificationsEnabled ?? null,
      recurrenceType: scheduleVersionCommand?.recurrenceType ?? null,
      reminderTimeLocal: scheduleVersionCommand?.reminderTimeLocal ?? null,
      seedStartDateLocal: scheduleVersionCommand?.seedStartDateLocal ?? null,
      titleCiphertext: encryptedContent.titleCiphertext,
      userId: input.userId,
      weekdayMask: scheduleVersionCommand?.weekdayMask ?? null,
    });
  }

  return getRecurringItemById({
    contentCipher,
    id: input.id,
    persistence,
    timezone: input.timezone,
    userId: input.userId,
  });
}

export async function archiveRecurringItem({
  client,
  id,
  persistence: providedPersistence,
}: ArchiveRecurringItemOptions): Promise<void> {
  const persistence = resolveRecurringItemsPersistence({
    client,
    persistence: providedPersistence,
  });

  await persistence.archiveItem({ id });
}
