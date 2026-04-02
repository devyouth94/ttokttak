import type { DeviceNotificationReservation } from "~/features/recurring/domain/types";
import {
  getRepositoryClient,
  type RepositoryClient,
} from "~/features/recurring/repositories/repository-client";
import type {
  DeviceNotificationReservationInsert,
  DeviceNotificationReservationRow,
} from "~/lib/database.types";

export type UpsertDeviceNotificationReservationInput = {
  deviceId: string;
  id?: string;
  itemId: string;
  localNotificationId: string;
  scheduledAtUtc: string;
  userId: string;
};

export type ListDeviceNotificationReservationsOptions = {
  client?: RepositoryClient;
  deviceId: string;
  itemIds?: string[];
  rangeEndUtc?: string;
  rangeStartUtc?: string;
  userId: string;
};

export type DeleteDeviceNotificationReservationsOptions = {
  client?: RepositoryClient;
  deviceId: string;
  reservationIds: string[];
  userId: string;
};

/**
 * DB row를 도메인에서 사용하는 notification reservation 형태로 변환한다.
 */
function toDeviceNotificationReservation(
  row: DeviceNotificationReservationRow
): DeviceNotificationReservation {
  return {
    id: row.id,
    userId: row.user_id,
    deviceId: row.device_id,
    itemId: row.item_id,
    scheduledAtUtc: row.scheduled_at_utc,
    localNotificationId: row.local_notification_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * reservation upsert 입력을 DB insert payload로 변환한다.
 */
function toDeviceNotificationReservationInsert(
  input: UpsertDeviceNotificationReservationInput
): DeviceNotificationReservationInsert {
  return {
    id: input.id,
    user_id: input.userId,
    device_id: input.deviceId,
    item_id: input.itemId,
    scheduled_at_utc: input.scheduledAtUtc,
    local_notification_id: input.localNotificationId,
  };
}

/**
 * 현재 기기의 notification reservation metadata를 조회한다.
 */
export async function listDeviceNotificationReservations({
  client,
  deviceId,
  itemIds,
  rangeEndUtc,
  rangeStartUtc,
  userId,
}: ListDeviceNotificationReservationsOptions): Promise<
  DeviceNotificationReservation[]
> {
  const supabase = getRepositoryClient(client);
  let query = supabase
    .from("device_notification_reservations")
    .select("*")
    .eq("device_id", deviceId)
    .eq("user_id", userId)
    .order("scheduled_at_utc", { ascending: true });

  if (rangeStartUtc) {
    query = query.gte("scheduled_at_utc", rangeStartUtc);
  }

  if (rangeEndUtc) {
    query = query.lte("scheduled_at_utc", rangeEndUtc);
  }

  if (itemIds && itemIds.length > 0) {
    query = query.in("item_id", itemIds);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data.map(toDeviceNotificationReservation);
}

/**
 * 현재 기기의 notification reservation metadata를 bulk upsert 한다.
 */
export async function upsertDeviceNotificationReservations(
  inputs: UpsertDeviceNotificationReservationInput[],
  client?: RepositoryClient
): Promise<DeviceNotificationReservation[]> {
  if (inputs.length === 0) {
    return [];
  }

  const supabase = getRepositoryClient(client);
  const { data, error } = await supabase
    .from("device_notification_reservations")
    .upsert(inputs.map(toDeviceNotificationReservationInsert), {
      onConflict: "device_id,item_id,scheduled_at_utc",
    })
    .select("*");

  if (error) {
    throw error;
  }

  return data.map(toDeviceNotificationReservation);
}

/**
 * 현재 기기에서 더 이상 유효하지 않은 reservation metadata를 삭제한다.
 */
export async function deleteDeviceNotificationReservations({
  client,
  deviceId,
  reservationIds,
  userId,
}: DeleteDeviceNotificationReservationsOptions): Promise<void> {
  if (reservationIds.length === 0) {
    return;
  }

  const supabase = getRepositoryClient(client);
  const { error } = await supabase
    .from("device_notification_reservations")
    .delete()
    .eq("device_id", deviceId)
    .eq("user_id", userId)
    .in("id", reservationIds);

  if (error) {
    throw error;
  }
}
