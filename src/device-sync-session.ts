import { Platform } from "react-native";

import type { AppLanguage } from "~/i18n/language";
import { getPermission } from "~/notifications/permission";
import {
  applyNotifications,
  clearNotifications,
  type NotificationStep,
  NotificationSyncError,
} from "~/notifications/sync";
import { listItems } from "~/schedule/db/items";
import { listLogs } from "~/schedule/db/logs";
import type { OccurrenceLog } from "~/schedule/rules/occurrence";
import type { Schedule } from "~/schedule/schedule";
import { captureException } from "~/sentry";
import { supabase } from "~/supabase";
import { applyHomeWidget } from "~/widgets/home";

type DeviceSyncParams = {
  language: AppLanguage;
  timezone: string;
  userId: string;
};
export type DeviceSyncInput = DeviceSyncParams & {
  now: Date;
  items: Schedule[];
  completionLogs: OccurrenceLog[];
};

let deviceWriteTail = Promise.resolve();
let currentSession: DeviceSyncSession | null = null;
const sessionEnded = Symbol("device-session-ended");

type DeviceSyncSession = {
  readonly active: boolean;
  readonly userId: string;
  refresh: (params: Omit<DeviceSyncParams, "userId">) => Promise<void>;
  close: () => Promise<void>;
};

/** 현재 사용자에 속한 갱신 요청과 종료를 한 수명으로 관리한다. */
export function startDeviceSyncSession(userId: string): DeviceSyncSession {
  void currentSession?.close();
  let active = true;
  let tail = Promise.resolve();
  let pending: {
    params: Omit<DeviceSyncParams, "userId">;
    promise: Promise<void>;
  } | null = null;
  let cleanup: Promise<void> | null = null;

  // 모든 비동기 단계의 전후에서 종료를 확인한다. 이미 시작한 OS 호출은 큐가 기다린다.
  const step: NotificationStep = async (stage, operation) => {
    if (!active) throw sessionEnded;
    try {
      const result = await operation();
      if (!active) throw sessionEnded;
      return result;
    } catch (cause) {
      if (!active || cause === sessionEnded) throw sessionEnded;
      if (cause instanceof NotificationSyncError) throw cause;
      throw new NotificationSyncError(stage, "operation-failed", cause);
    }
  };

  const session: DeviceSyncSession = {
    userId,
    get active() {
      return active;
    },
    refresh(params) {
      if (!active) return Promise.resolve();
      if (pending) {
        pending.params = params;
        return pending.promise;
      }
      const batch = { params, promise: Promise.resolve() };
      batch.promise = tail.then(async () => {
        pending = null;
        try {
          await syncDeviceOutputsNow({ ...batch.params, userId }, step);
        } catch (error) {
          if (error !== sessionEnded) throw error;
        }
      });
      pending = batch;
      tail = batch.promise.catch(() => undefined);
      return batch.promise;
    },
    close() {
      active = false;
      if (currentSession === session) currentSession = null;
      cleanup ??= enqueueDeviceWrite(clearOutputs);
      return cleanup;
    },
  };
  currentSession = session;
  return session;
}

/** 로그아웃과 계정 삭제 뒤 똑딱 알림·뱃지·위젯을 정리한다. */
export function clearDeviceOutputs(): Promise<void> {
  return currentSession
    ? currentSession.close()
    : enqueueDeviceWrite(clearOutputs);
}

// 조회가 지연돼도 정리는 진행하고, 진행 중인 OS 쓰기와 정리는 같은 순서로 끝낸다.
function enqueueDeviceWrite(operation: () => Promise<void>): Promise<void> {
  const write = deviceWriteTail.then(operation);
  deviceWriteTail = write.catch(() => undefined);
  return write;
}

/** 두 출력이 같은 조회 결과와 기준시각을 사용한다. 조회 실패는 clear가 아니다. */
async function syncDeviceOutputsNow(
  params: DeviceSyncParams,
  step: NotificationStep
): Promise<void> {
  let permissionError: unknown;
  const permission = await step("permission", getPermission).catch((error) => {
    if (error === sessionEnded) throw error;
    permissionError = error;
    return null;
  });
  const notificationsEnabled = permission?.status === "granted";
  if (!notificationsEnabled && Platform.OS !== "ios") {
    if (permissionError) throw permissionError;
    return;
  }
  const accessToken = await step("items", () => getAccessToken(params.userId));
  if (!accessToken) return;
  let data;
  try {
    data = await loadData(params.userId, step);
  } catch (error) {
    const refreshed = await step("items", () => getAccessToken(params.userId));
    if (!refreshed) return;
    if (refreshed === accessToken) throw error;
    // ponytail: 연속 토큰 갱신은 다음 lifecycle에 맡기고 한 번만 다시 읽는다.
    data = await loadData(params.userId, step);
  }
  const input: DeviceSyncInput = { ...params, ...data, now: new Date() };
  await enqueueDeviceWrite(async () => {
    const [notification] = await Promise.allSettled([
      notificationsEnabled
        ? applyNotifications(input, step)
        : Promise.resolve(),
      Platform.OS === "ios"
        ? step("candidates", () => syncWidgetSafely(input))
        : Promise.resolve(),
    ]);
    if (notification.status === "rejected") throw notification.reason;
  });
  if (permissionError) throw permissionError;
}

async function loadData(userId: string, step: NotificationStep) {
  const items = await step("items", () => listItems({ userId }));
  const itemIds = items.map((item) => item.id);
  const completionLogs = itemIds.length
    ? await step("logs", () => listLogs({ itemIds, userId }))
    : [];
  return { items, completionLogs };
}

async function getAccessToken(userId: string): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user.id === userId ? data.session.access_token : null;
}

async function syncWidgetSafely(input: DeviceSyncInput | null): Promise<void> {
  try {
    applyHomeWidget(input);
  } catch (error) {
    captureException(error, { tags: { feature: "ios-home-widget-sync" } });
  }
}

async function clearOutputs(): Promise<void> {
  await Promise.all([clearNotifications(), syncWidgetSafely(null)]);
}
