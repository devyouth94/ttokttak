import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),
  tracesSampleRate: 0.2,
  environment: __DEV__ ? "development" : "production",
  release: `${Constants.expoConfig?.slug ?? "ttokttak"}@${
    Constants.expoConfig?.version ?? "1.0.0"
  }`,
  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
    }

    return event;
  },
});

export { Sentry };
