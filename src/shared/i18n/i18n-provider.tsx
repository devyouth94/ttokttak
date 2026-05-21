import { type PropsWithChildren, useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";

import { appI18n, ensureAppI18nInitialized } from "./app-i18n";
import { shouldRenderI18nContent } from "./i18n-gate";

export function AppI18nProvider({
  children,
}: PropsWithChildren): React.JSX.Element | null {
  const [isReady, setIsReady] = useState(appI18n.isInitialized);

  useEffect(() => {
    let isMounted = true;

    void ensureAppI18nInitialized().finally(() => {
      if (isMounted) {
        setIsReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!shouldRenderI18nContent(isReady)) {
    return null;
  }

  return <I18nextProvider i18n={appI18n}>{children}</I18nextProvider>;
}
