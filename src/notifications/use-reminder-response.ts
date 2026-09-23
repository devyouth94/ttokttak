import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { captureException } from "~/sentry";

/**
 * 앱 시작 전 마지막 알림 응답과 실행 중 tap을 감시한다.
 * 일정 알림이면 홈으로 이동하고 Provider의 재동기화를 요청한다.
 */
export function useReminderResponse(onTap: () => void): void {
  const handledIds = useRef(new Set<string>());
  const latestOnTap = useRef(onTap);

  useEffect(() => {
    latestOnTap.current = onTap;
  }, [onTap]);

  useEffect(() => {
    let active = true;
    function handle(response: Notifications.NotificationResponse | null) {
      if (
        !active ||
        !response ||
        handledIds.current.has(response.notification.request.identifier) ||
        !isReminderResponse(response)
      ) {
        return;
      }

      handledIds.current.add(response.notification.request.identifier);
      router.replace("/home");
      latestOnTap.current();
    }

    void Notifications.getLastNotificationResponseAsync()
      .then(async (response) => {
        if (!active) return;
        handle(response);
        await Notifications.clearLastNotificationResponseAsync();
      })
      .catch((error) => {
        captureException(error, {
          tags: { feature: "local-notification-response" },
        });
      });

    const subscription =
      Notifications.addNotificationResponseReceivedListener(handle);

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
}

/** 사용자가 누른 응답이 똑딱의 일정 알림인지 확인한다. */
function isReminderResponse(
  response: Notifications.NotificationResponse
): boolean {
  const data = response.notification.request.content.data;

  return (
    response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER &&
    data?.notificationKind === "reminder" &&
    data?.source === "recurring-item"
  );
}
