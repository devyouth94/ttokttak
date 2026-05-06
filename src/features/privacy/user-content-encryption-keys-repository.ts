import {
  getRepositoryClient,
  type RepositoryClient,
} from "~/features/recurring/repositories/repository-client";
import type {
  UserContentEncryptionKeyInsert,
  UserContentEncryptionKeyRow,
} from "~/lib/database.types";

export type UserContentEncryptionKey = {
  createdAt: string;
  keyVersion: number;
  updatedAt: string;
  userId: string;
  wrapAlgorithm: string;
  wrapMetadata: Record<string, unknown>;
  wrappedKey: string;
};

export type UpsertUserContentEncryptionKeyInput = {
  keyVersion: number;
  userId: string;
  wrapAlgorithm: string;
  wrapMetadata: Record<string, unknown>;
  wrappedKey: string;
};

export type GetUserContentEncryptionKeyOptions = {
  client?: RepositoryClient;
  keyVersion: number;
  userId: string;
};

function toUserContentEncryptionKey(
  row: UserContentEncryptionKeyRow
): UserContentEncryptionKey {
  return {
    createdAt: row.created_at,
    keyVersion: row.key_version,
    updatedAt: row.updated_at,
    userId: row.user_id,
    wrapAlgorithm: row.wrap_algorithm,
    wrapMetadata: row.wrap_metadata,
    wrappedKey: row.wrapped_key,
  };
}

function toUserContentEncryptionKeyInsert(
  input: UpsertUserContentEncryptionKeyInput
): UserContentEncryptionKeyInsert {
  return {
    key_version: input.keyVersion,
    user_id: input.userId,
    wrap_algorithm: input.wrapAlgorithm,
    wrap_metadata: input.wrapMetadata,
    wrapped_key: input.wrappedKey,
  };
}

export async function upsertUserContentEncryptionKey(
  input: UpsertUserContentEncryptionKeyInput,
  client?: RepositoryClient
): Promise<UserContentEncryptionKey> {
  const supabase = getRepositoryClient(client);
  const { data, error } = await supabase
    .from("user_content_encryption_keys")
    .upsert(toUserContentEncryptionKeyInsert(input), {
      onConflict: "user_id,key_version",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toUserContentEncryptionKey(data);
}

export async function getUserContentEncryptionKey({
  client,
  keyVersion,
  userId,
}: GetUserContentEncryptionKeyOptions): Promise<UserContentEncryptionKey | null> {
  const supabase = getRepositoryClient(client);
  const { data, error } = await supabase
    .from("user_content_encryption_keys")
    .select("*")
    .eq("user_id", userId)
    .eq("key_version", keyVersion)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toUserContentEncryptionKey(data) : null;
}
