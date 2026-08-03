import type { appI18nResources } from "./resources";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: (typeof appI18nResources)["ko"]["translation"];
  }
}
