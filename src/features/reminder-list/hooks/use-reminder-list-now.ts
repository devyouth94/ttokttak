import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

const NOW_REFRESH_INTERVAL_MS = 60_000;

export function useReminderListNow(): Date {
  const [now, setNow] = useState(() => new Date());

  const refreshNow = useCallback(() => {
    setNow(new Date());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshNow();

      const intervalId = setInterval(refreshNow, NOW_REFRESH_INTERVAL_MS);

      return () => {
        clearInterval(intervalId);
      };
    }, [refreshNow])
  );

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          refreshNow();
        }
      }
    );

    return () => {
      appStateSubscription.remove();
    };
  }, [refreshNow]);

  return now;
}
