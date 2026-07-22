import { useTranslation } from "react-i18next";
import { Stack } from "expo-router";

import { AppBootstrap } from "~/application/bootstrap";
import { AppProviders } from "~/application/providers";
import { wrap } from "~/sentry";
import { useSession } from "~/session/provider";
import { useThemeColors } from "~/theme/provider";
import { StateMessage } from "~/ui/state-message";

function RootLayout() {
  return (
    <AppProviders>
      <RootStack />
    </AppProviders>
  );
}

function RootStack(): React.JSX.Element {
  const { t } = useTranslation();

  const { retry, status } = useSession();
  const themeColors = useThemeColors();

  return (
    <>
      <AppBootstrap />

      {status === "error" && (
        <StateMessage
          action={{
            accessibilityHint: t("session.error.retryHint"),
            label: t("session.error.retryLabel"),
            onPress: () => {
              void retry();
            },
          }}
          description={t("session.error.description")}
          style={{ backgroundColor: themeColors.background }}
          title={t("session.error.title")}
        />
      )}

      {status !== "error" && (
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: themeColors.background },
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        </Stack>
      )}
    </>
  );
}

export default wrap(RootLayout);
