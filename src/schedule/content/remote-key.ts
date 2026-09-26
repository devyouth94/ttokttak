import type { Database } from "~/database.types";
import { supabase } from "~/supabase";

type KeyInsert =
  Database["public"]["Tables"]["user_content_encryption_keys"]["Insert"];
type Client = typeof supabase;

type WrapResponse = {
  wrapAlgorithm: string;
  wrapMetadata: Record<string, unknown>;
  wrappedKey: string;
};

type RecoverResponse = {
  encodedKey: string | null;
};

/** 사용자의 해당 버전 content key가 서버에 저장되어 있는지 확인한다. */
export async function findContentKey(
  input: {
    keyVersion: number;
    userId: string;
  },
  client: Client = supabase
): Promise<boolean> {
  const { data, error } = await client
    .from("user_content_encryption_keys")
    .select("user_id")
    .eq("user_id", input.userId)
    .eq("key_version", input.keyVersion)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data !== null;
}

/** 서버 복구용 wrapped content key를 저장한다. */
export async function saveContentKey(
  input: {
    keyVersion: number;
    userId: string;
    wrapAlgorithm: string;
    wrapMetadata: Record<string, unknown>;
    wrappedKey: string;
  },
  client: Client = supabase
): Promise<void> {
  const row: KeyInsert = {
    key_version: input.keyVersion,
    user_id: input.userId,
    wrap_algorithm: input.wrapAlgorithm,
    wrap_metadata: input.wrapMetadata,
    wrapped_key: input.wrappedKey,
  };
  const { error } = await client
    .from("user_content_encryption_keys")
    .upsert(row, { onConflict: "user_id,key_version" });

  if (error) {
    throw error;
  }
}

/** content key를 서버 복구 경계에서 감싼다. */
export async function wrapContentKey(
  input: {
    encodedKey: string;
    keyVersion: number;
  },
  client: Client = supabase
): Promise<WrapResponse> {
  const { data, error } = await client.functions.invoke<WrapResponse>(
    "recover-content-key",
    {
      body: {
        action: "wrap",
        encodedKey: input.encodedKey,
        keyVersion: input.keyVersion,
      },
    }
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("일정 내용 암호화 키를 감싸지 못했습니다.");
  }

  return data;
}

/** 서버에 저장한 wrapped key에서 content key를 복구한다. */
export async function recoverContentKey(
  keyVersion: number,
  client: Client = supabase
): Promise<string | null> {
  const { data, error } = await client.functions.invoke<RecoverResponse>(
    "recover-content-key",
    {
      body: { action: "recover", keyVersion },
    }
  );

  if (error) {
    throw error;
  }

  return data?.encodedKey ?? null;
}
