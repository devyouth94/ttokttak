import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

const refreshInterval = 60_000;

/** 화면이 활성화된 동안 현재 시각을 분 단위로 갱신한다. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  const refresh = useCallback(() => setNow(new Date()), []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const interval = setInterval(refresh, refreshInterval);

      return () => clearInterval(interval);
    }, [refresh])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refresh();
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  return now;
}
