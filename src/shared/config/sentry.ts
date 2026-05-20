import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

import { sanitizeSentryEvent } from "~/shared/lib/privacy/sentry-sanitizer";

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),
  tracesSampleRate: 0.2,
  environment: __DEV__ ? "development" : "production",
  release: `${Constants.expoConfig?.slug ?? "ttokttak"}@${
    Constants.expoConfig?.version ?? "1.0.0"
  }`,
  beforeSend: sanitizeSentryEvent,
});

export { Sentry };
