const withLocalNotificationsOnly = require("./with-local-notifications-only");

async function applyMod(platform, mod, modResults) {
  const config = withLocalNotificationsOnly({ name: "test", slug: "test" });

  return (
    await config.mods[platform][mod]({
      ...config,
      modResults,
      modRequest: {
        introspect: true,
        modName: mod,
        platform,
        platformProjectRoot: "",
        projectRoot: process.cwd(),
      },
    })
  ).modResults;
}

it("원격 푸시 네이티브 설정만 제거한다", async () => {
  const entitlements = await applyMod("ios", "entitlements", {
    "aps-environment": "development",
    "com.apple.developer.applesignin": ["Default"],
  });
  const infoPlist = await applyMod("ios", "infoPlist", {
    UIBackgroundModes: ["remote-notification", "fetch"],
  });
  const androidManifest = await applyMod("android", "manifest", {
    manifest: {
      application: [
        {
          $: { "android:name": ".MainApplication" },
          "meta-data": [
            {
              $: {
                "android:name":
                  "com.google.firebase.messaging.default_notification_channel_id",
              },
            },
            {
              $: {
                "android:name":
                  "com.google.firebase.messaging.default_notification_color",
              },
            },
            {
              $: {
                "android:name":
                  "com.google.firebase.messaging.default_notification_icon",
              },
            },
            { $: { "android:name": "keep" } },
          ],
        },
      ],
    },
  });

  expect(entitlements).toEqual({
    "com.apple.developer.applesignin": ["Default"],
  });
  expect(infoPlist.UIBackgroundModes).toEqual(["fetch"]);
  expect(androidManifest.manifest.application[0]["meta-data"]).toEqual([
    { $: { "android:name": "keep" } },
  ]);
});
