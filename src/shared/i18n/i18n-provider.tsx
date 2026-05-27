import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { I18nextProvider } from "react-i18next";
import { StyleSheet } from "react-native";

import { AppScreen } from "~/shared/ui/app-screen";
import { AppRetryStateView } from "~/shared/ui/app-state";

import { appI18n, ensureAppI18nInitialized } from "./app-i18n";

type AppI18nProviderStatus = "failed" | "loading" | "ready";

export function AppI18nProvider({
  children,
}: PropsWithChildren): React.JSX.Element | null {
  const isMountedRef = useRef(false);
  const [status, setStatus] = useState<AppI18nProviderStatus>(() =>
    appI18n.isInitialized ? "ready" : "loading"
  );

  const setMountedStatus = useCallback((nextStatus: AppI18nProviderStatus) => {
    if (isMountedRef.current) {
      setStatus(nextStatus);
    }
  }, []);

  const initializeAppI18n = useCallback(() => {
    if (appI18n.isInitialized) {
      setStatus("ready");
      return;
    }

    setStatus("loading");

    void ensureAppI18nInitialized()
      .then(() => {
        setMountedStatus(appI18n.isInitialized ? "ready" : "failed");
      })
      .catch(() => {
        setMountedStatus(appI18n.isInitialized ? "ready" : "failed");
      });
  }, [setMountedStatus]);

  useEffect(() => {
    isMountedRef.current = true;
    initializeAppI18n();

    return () => {
      isMountedRef.current = false;
    };
  }, [initializeAppI18n]);

  if (status === "failed") {
    return (
      <AppScreen contentStyle={styles.bootstrapError}>
        <AppRetryStateView
          description="앱 표시 언어를 준비하는 중 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요."
          onRetry={initializeAppI18n}
          retryAccessibilityHint="앱 표시 언어 초기화를 다시 시도합니다."
          title="앱을 시작하지 못했어요"
        />
      </AppScreen>
    );
  }

  if (status !== "ready") {
    return null;
  }

  return <I18nextProvider i18n={appI18n}>{children}</I18nextProvider>;
}

const styles = StyleSheet.create({
  bootstrapError: {
    justifyContent: "center",
    paddingHorizontal: 24,
  },
});
