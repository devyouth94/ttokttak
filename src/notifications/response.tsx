import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

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

/**
 * 앱 시작 전 마지막 알림 응답과 실행 중 tap을 감시한다.
 * 일정 알림이면 홈으로 이동하고 Provider의 재동기화를 요청한다.
 */
export function NotificationResponse({ onTap }: { onTap: () => void }): null {
  const handledIds = useRef(new Set<string>());

  useEffect(() => {
    function handle(response: Notifications.NotificationResponse | null) {
      if (
        !response ||
        handledIds.current.has(response.notification.request.identifier) ||
        !isReminderResponse(response)
      ) {
        return;
      }

      handledIds.current.add(response.notification.request.identifier);
      router.replace("/home");
      onTap();
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      handle(response);
      void Notifications.clearLastNotificationResponseAsync();
    });

    const subscription =
      Notifications.addNotificationResponseReceivedListener(handle);

    return () => subscription.remove();
  }, [onTap]);

  return null;
}
