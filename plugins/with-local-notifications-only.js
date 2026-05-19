const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withEntitlementsPlist,
  withInfoPlist,
} = require("expo/config-plugins");

const REMOTE_PUSH_ANDROID_METADATA_NAMES = new Set([
  "com.google.firebase.messaging.default_notification_channel_id",
  "com.google.firebase.messaging.default_notification_color",
  "com.google.firebase.messaging.default_notification_icon",
]);

function withoutRemoteNotificationBackgroundMode(modes) {
  if (!Array.isArray(modes)) {
    return modes;
  }

  const nextModes = modes.filter((mode) => mode !== "remote-notification");

  return nextModes.length > 0 ? nextModes : undefined;
}

function withLocalNotificationsOnly(config) {
  config = withEntitlementsPlist(config, (config) => {
    delete config.modResults["aps-environment"];

    return config;
  });

  config = withInfoPlist(config, (config) => {
    const nextModes = withoutRemoteNotificationBackgroundMode(
      config.modResults.UIBackgroundModes
    );

    if (nextModes) {
      config.modResults.UIBackgroundModes = nextModes;
    } else {
      delete config.modResults.UIBackgroundModes;
    }

    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults
    );

    mainApplication["meta-data"] = (mainApplication["meta-data"] ?? []).filter(
      (metadata) =>
        !REMOTE_PUSH_ANDROID_METADATA_NAMES.has(metadata.$?.["android:name"])
    );

    return config;
  });

  return config;
}

module.exports = createRunOncePlugin(
  withLocalNotificationsOnly,
  "with-local-notifications-only",
  "1.0.0"
);
