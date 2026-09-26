import type { ErrorEvent, Stacktrace } from "@sentry/react-native";

// 새 동기화 단계가 자동 전송되지 않도록 보안 허용 목록을 공통 상수와 분리한다.
const notificationSyncStages = new Set([
  "permission",
  "items",
  "logs",
  "candidates",
  "list-scheduled",
  "cancel",
  "schedule",
  "verify",
]);
const notificationSyncErrorCodes = new Set([
  "operation-failed",
  "verification-mismatch",
]);

/** Sentry 오류 event를 개인정보가 포함되지 않은 허용 목록으로 제한한다. */
export function sanitizeEvent(
  event: ErrorEvent,
  originalException?: unknown
): ErrorEvent {
  return {
    debug_meta: event.debug_meta,
    dist: event.dist,
    environment: event.environment,
    event_id: event.event_id,
    exception: event.exception && {
      values: event.exception.values?.map((exception) => ({
        stacktrace: sanitizeStack(exception.stacktrace),
        type: exception.type,
      })),
    },
    level: event.level,
    platform: event.platform,
    release: event.release,
    sdk: event.sdk,
    tags: sanitizeTags({
      ...event.tags,
      ...getNotificationSyncTags(originalException),
    }),
    threads: event.threads && {
      values: event.threads.values.map((thread) => ({
        crashed: thread.crashed,
        current: thread.current,
        id: thread.id,
        main: thread.main,
        name: thread.name,
        stacktrace: sanitizeStack(thread.stacktrace),
      })),
    },
    timestamp: event.timestamp,
    type: undefined,
  };
}

/** Stack frame에서 실행 중 수집된 변수와 허용하지 않은 정보를 제거한다. */
function sanitizeStack(stacktrace?: Stacktrace): Stacktrace | undefined {
  return (
    stacktrace && {
      frames: stacktrace.frames?.map((frame) => ({
        abs_path: frame.abs_path,
        addr_mode: frame.addr_mode,
        colno: frame.colno,
        debug_id: frame.debug_id,
        filename: frame.filename,
        function: frame.function,
        in_app: frame.in_app,
        instruction_addr: frame.instruction_addr,
        lineno: frame.lineno,
        module: frame.module,
        platform: frame.platform,
      })),
      frames_omitted: stacktrace.frames_omitted,
    }
  );
}

/** 오류 분류에 사용하는 허용된 tag만 남긴다. */
function sanitizeTags(tags: ErrorEvent["tags"]): ErrorEvent["tags"] {
  const sanitized: ErrorEvent["tags"] = {};

  if (tags?.feature !== undefined) {
    sanitized.feature = tags.feature;
  }

  if (tags?.reason !== undefined) {
    sanitized.reason = tags.reason;
  }

  if (
    typeof tags?.stage === "string" &&
    notificationSyncStages.has(tags.stage)
  ) {
    sanitized.stage = tags.stage;
  }

  if (
    typeof tags?.error_code === "string" &&
    notificationSyncErrorCodes.has(tags.error_code)
  ) {
    sanitized.error_code = tags.error_code;
  }

  return sanitized;
}

/** 알림 오류 객체에서 Sentry에 허용한 내부 분류만 읽는다. */
function getNotificationSyncTags(error: unknown): ErrorEvent["tags"] {
  if (!(error instanceof Error)) {
    return {};
  }

  const stage = "stage" in error ? error.stage : undefined;
  const errorCode = "errorCode" in error ? error.errorCode : undefined;
  const tags: ErrorEvent["tags"] = {};

  if (typeof stage === "string") {
    tags.stage = stage;
  }

  if (typeof errorCode === "string") {
    tags.error_code = errorCode;
  }

  return tags;
}
