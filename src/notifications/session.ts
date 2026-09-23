import {
  clearNotifications,
  type NotificationStep,
  NotificationSyncError,
  type NotificationSyncParams,
  syncNotificationsNow,
} from "./sync";

let notificationWriteTail = Promise.resolve();
let currentSession: NotificationSession | null = null;
const sessionEnded = Symbol("notification-session-ended");

type NotificationSession = {
  readonly active: boolean;
  readonly userId: string;
  refresh: (params: Omit<NotificationSyncParams, "userId">) => Promise<void>;
  close: () => Promise<void>;
};

/** 현재 사용자에 속한 갱신 요청과 종료를 한 수명으로 관리한다. */
export function startNotificationSession(userId: string): NotificationSession {
  void currentSession?.close();
  let active = true;
  let tail = Promise.resolve();
  let pending: {
    params: Omit<NotificationSyncParams, "userId">;
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

  const session: NotificationSession = {
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
          await syncNotificationsNow(
            { ...batch.params, userId },
            step,
            enqueueNotificationWrite
          );
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
      cleanup ??= enqueueNotificationWrite(clearNotifications);
      return cleanup;
    },
  };
  currentSession = session;
  return session;
}

/** 로그아웃과 계정 삭제 뒤 현재 기기의 모든 똑딱 알림과 뱃지를 정리한다. */
export function cancelNotifications(): Promise<void> {
  return currentSession
    ? currentSession.close()
    : enqueueNotificationWrite(clearNotifications);
}

// 조회가 지연돼도 정리는 진행하고, 진행 중인 OS 쓰기와 정리는 같은 순서로 끝낸다.
function enqueueNotificationWrite(
  operation: () => Promise<void>
): Promise<void> {
  const write = notificationWriteTail.then(operation);
  notificationWriteTail = write.catch(() => undefined);
  return write;
}
