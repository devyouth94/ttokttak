import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";
import { SplashScreen } from "expo-router";

import { AppScreen } from "~/ui/app-screen";
import { StateMessage } from "~/ui/state-message";

import { appI18n, changeAppLanguage, initializeAppI18n } from "./i18n";
import { type AppLanguage, normalizeAppLanguage } from "./language";

type Status = "failed" | "loading" | "ready";

export function AppI18nProvider({
  children,
}: PropsWithChildren): React.JSX.Element | null {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>(() =>
    appI18n.isInitialized ? "ready" : "loading"
  );

  useEffect(() => {
    let active = true;

    setStatus(appI18n.isInitialized ? "ready" : "loading");
    void initializeAppI18n().then(
      () => {
        if (active) {
          setStatus("ready");
        }
      },
      () => {
        void SplashScreen.hideAsync();
        if (active) {
          setStatus("failed");
        }
      }
    );

    return () => {
      active = false;
    };
  }, [attempt]);

  if (status === "failed") {
    return (
      <AppScreen contentStyle={styles.bootstrapError}>
        <StateMessage
          action={{
            accessibilityHint: "표시 언어 초기화를 다시 시도합니다.",
            label: "다시 시도",
            onPress: () => setAttempt((current) => current + 1),
          }}
          description="표시 언어를 준비하는 중 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요."
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

export function useAppLanguage(): {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
} {
  const { i18n } = useTranslation();

  return {
    language: normalizeAppLanguage(i18n.resolvedLanguage ?? i18n.language),
    setLanguage: changeAppLanguage,
  };
}

const styles = StyleSheet.create({
  bootstrapError: {
    justifyContent: "center",
    paddingHorizontal: 24,
  },
});
