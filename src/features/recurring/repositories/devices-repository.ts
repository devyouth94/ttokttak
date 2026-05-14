import type { Device } from "~/features/recurring/domain/types";
import {
  getRepositoryClient,
  type RepositoryClient,
} from "~/features/recurring/repositories/repository-client";
import type {
  DeviceInsert,
  DeviceRow,
  DeviceUpdate,
} from "~/lib/database.types";

export type UpsertDeviceInput = {
  deviceName?: string | null;
  id?: string;
  isActive?: boolean;
  lastSeenAt?: string | null;
  platform: Device["platform"];
  userId: string;
};

export type ListDevicesOptions = {
  client?: RepositoryClient;
  includeInactive?: boolean;
  userId: string;
};

export type GetDeviceOptions = {
  client?: RepositoryClient;
  id: string;
  userId: string;
};

export type UpdateDeviceInput = {
  deviceName?: string | null;
  id: string;
  isActive?: boolean;
  lastSeenAt?: string | null;
  platform?: Device["platform"];
  userId: string;
};

export type DeactivateDeviceOptions = {
  client?: RepositoryClient;
  id: string;
  userId: string;
};

const activeDeviceListLimit = 50;
const inactiveIncludedDeviceListLimit = 100;

/**
 * DB row를 도메인에서 사용하는 device 형태로 변환한다.
 */
function toDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform as Device["platform"],
    deviceName: row.device_name,
    isActive: row.is_active,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * device upsert 입력을 DB insert payload로 변환한다.
 */
function toDeviceInsert(input: UpsertDeviceInput): DeviceInsert {
  return {
    id: input.id,
    user_id: input.userId,
    platform: input.platform,
    device_name: input.deviceName,
    is_active: input.isActive,
    last_seen_at: input.lastSeenAt,
  };
}

/**
 * device 수정 입력을 DB update payload로 변환한다.
 */
function toDeviceUpdate(input: UpdateDeviceInput): DeviceUpdate {
  const update: DeviceUpdate = {};

  if (input.platform !== undefined) {
    update.platform = input.platform;
  }

  if (input.deviceName !== undefined) {
    update.device_name = input.deviceName;
  }

  if (input.isActive !== undefined) {
    update.is_active = input.isActive;
  }

  if (input.lastSeenAt !== undefined) {
    update.last_seen_at = input.lastSeenAt;
  }

  return update;
}

/**
 * 현재 사용자의 device 목록을 조회한다.
 * 기본값은 활성 device만 반환한다.
 */
export async function listDevices({
  client,
  includeInactive = false,
  userId,
}: ListDevicesOptions): Promise<Device[]> {
  const supabase = getRepositoryClient(client);
  let query = supabase
    .from("devices")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.limit(
    includeInactive ? inactiveIncludedDeviceListLimit : activeDeviceListLimit
  );

  if (error) {
    throw error;
  }

  return data.map(toDevice);
}

/**
 * 현재 사용자가 소유한 device 하나를 조회한다.
 */
export async function getDeviceById({
  client,
  id,
  userId,
}: GetDeviceOptions): Promise<Device | null> {
  const supabase = getRepositoryClient(client);
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toDevice(data) : null;
}

/**
 * 현재 device를 생성하거나 기존 row를 최신 상태로 갱신한다.
 * on conflict 기준은 device id다.
 */
export async function upsertDevice(
  input: UpsertDeviceInput,
  client?: RepositoryClient
): Promise<Device> {
  const supabase = getRepositoryClient(client);
  const { data, error } = await supabase
    .from("devices")
    .upsert(toDeviceInsert(input), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toDevice(data);
}

/**
 * 현재 사용자가 소유한 device 상태를 일부 갱신한다.
 */
export async function updateDevice(
  input: UpdateDeviceInput,
  client?: RepositoryClient
): Promise<Device> {
  const supabase = getRepositoryClient(client);
  const { data, error } = await supabase
    .from("devices")
    .update(toDeviceUpdate(input))
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toDevice(data);
}

/**
 * 현재 사용자의 device를 비활성 상태로 전환한다.
 */
export async function deactivateDevice({
  client,
  id,
  userId,
}: DeactivateDeviceOptions): Promise<Device> {
  return updateDevice(
    {
      id,
      isActive: false,
      userId,
    },
    client
  );
}
