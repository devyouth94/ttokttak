import { AppBootstrap } from "~/application/bootstrap";
import { ThemedRootStack } from "~/application/navigation";
import { AppProviders } from "~/application/providers";
import { Sentry } from "~/shared/config/sentry";

function RootLayout() {
  return (
    <AppProviders>
      <RootStack />
    </AppProviders>
  );
}

function RootStack(): React.JSX.Element {
  return (
    <>
      <AppBootstrap />
      <ThemedRootStack />
    </>
  );
}

export default Sentry.wrap(RootLayout);
