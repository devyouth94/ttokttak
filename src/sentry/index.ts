import * as Sentry from "@sentry/react-native";

import { sanitizeEvent } from "./event";

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),
  beforeSend: sanitizeEvent,
});

export const { captureException, wrap } = Sentry;
