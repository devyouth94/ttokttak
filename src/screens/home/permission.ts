import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { useIsFocused } from "@react-navigation/native";

import { getErrorMessage } from "~/errors";
import { useNotifications } from "~/notifications/provider";
import { useSession } from "~/session/provider";

let hasShownPrompt = false;

/**
 * 로그인한 사용자가 홈에 처음 진입했을 때 알림 권한을 한 번 요청한다.
 * 설정 화면의 수동 권한 요청과 달리 홈의 자동 prompt 시점만 소유한다.
 */
export function useHomeNotificationPrompt(): void {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const { status: sessionStatus, user } = useSession();
  const { permission, requestPermission } = useNotifications();

  useEffect(() => {
    if (
      hasShownPrompt ||
      !isFocused ||
      sessionStatus !== "ready" ||
      !user?.id ||
      permission.status === "granted" ||
      permission.status === "unsupported" ||
      !permission.canRequest
    ) {
      return;
    }

    hasShownPrompt = true;
    Alert.alert(
      t("home.notificationPermission.title"),
      t("home.notificationPermission.message"),
      [
        {
          style: "cancel",
          text: t("home.notificationPermission.cancel"),
        },
        {
          onPress: () => {
            void requestPermission().catch((error) => {
              Alert.alert(
                t("home.notificationPermission.errorTitle"),
                getErrorMessage(error)
              );
            });
          },
          text: t("home.notificationPermission.request"),
        },
      ]
    );
  }, [
    isFocused,
    permission.canRequest,
    permission.status,
    requestPermission,
    sessionStatus,
    t,
    user?.id,
  ]);
}
