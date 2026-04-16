import type { DevicePushToken } from "~/features/recurring/domain/types";
import {
  getRepositoryClient,
  type RepositoryClient,
} from "~/features/recurring/repositories/repository-client";
import type {
  DevicePushTokenInsert,
  DevicePushTokenRow,
  DevicePushTokenUpdate,
} from "~/lib/database.types";

export type UpsertDevicePushTokenInput = {
  deviceId: string;
  lastRegisteredAt?: string;
  permissionStatus?: DevicePushToken["permissionStatus"];
  platform: DevicePushToken["platform"];
  pushProvider: DevicePushToken["pushProvider"];
  pushToken: string;
  userId: string;
};

export type DeactivateDevicePushTokensOptions = {
  client?: RepositoryClient;
  deviceId: string;
  reason: NonNullable<DevicePushToken["deactivationReason"]>;
  userId: string;
};

/**
 * DB row를 도메인에서 사용하는 push token 형태로 변환한다.
 */
function toDevicePushToken(row: DevicePushTokenRow): DevicePushToken {
  return {
    createdAt: row.created_at,
    deactivatedAt: row.deactivated_at,
    deactivationReason:
      row.deactivation_reason as DevicePushToken["deactivationReason"],
    deviceId: row.device_id,
    id: row.id,
    isActive: row.is_active,
    lastRegisteredAt: row.last_registered_at,
    permissionStatus:
      row.permission_status as DevicePushToken["permissionStatus"],
    platform: row.platform as DevicePushToken["platform"],
    pushProvider: row.push_provider as DevicePushToken["pushProvider"],
    pushToken: row.push_token,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

/**
 * push token upsert 입력을 DB insert payload로 변환한다.
 */
function toDevicePushTokenInsert(
  input: UpsertDevicePushTokenInput
): DevicePushTokenInsert {
  return {
    deactivated_at: null,
    deactivation_reason: null,
    device_id: input.deviceId,
    is_active: true,
    last_registered_at: input.lastRegisteredAt,
    permission_status: input.permissionStatus ?? "granted",
    platform: input.platform,
    push_provider: input.pushProvider,
    push_token: input.pushToken,
    user_id: input.userId,
  };
}

/**
 * 현재 기기의 push token을 provider 단위로 upsert 한다.
 * token이 바뀌면 기존 row를 덮어쓴다.
 */
export async function upsertDevicePushToken(
  input: UpsertDevicePushTokenInput,
  client?: RepositoryClient
): Promise<DevicePushToken> {
  const supabase = getRepositoryClient(client);
  const { data, error } = await supabase
    .from("device_push_tokens")
    .upsert(toDevicePushTokenInsert(input), {
      onConflict: "device_id,push_provider",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toDevicePushToken(data);
}

/**
 * 현재 기기의 활성 push token을 일괄 비활성화한다.
 */
export async function deactivateDevicePushTokens({
  client,
  deviceId,
  reason,
  userId,
}: DeactivateDevicePushTokensOptions): Promise<DevicePushToken[]> {
  const supabase = getRepositoryClient(client);
  const update: DevicePushTokenUpdate = {
    deactivated_at: new Date().toISOString(),
    deactivation_reason: reason,
    is_active: false,
    permission_status: reason === "permission-denied" ? "denied" : "granted",
  };
  const { data, error } = await supabase
    .from("device_push_tokens")
    .update(update)
    .eq("device_id", deviceId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .select("*");

  if (error) {
    throw error;
  }

  return data.map(toDevicePushToken);
}
