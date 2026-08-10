import type { ExpoConfig } from "expo/config";

const iconBackgroundColor = "#FFFFFF";
const missingGoogleIosUrlScheme =
  "com.googleusercontent.apps.missing-google-ios-url-scheme";

function getGoogleIosUrlScheme(): string {
  const googleIosUrlScheme = process.env.GOOGLE_AUTH_IOS_URL_SCHEME;

  if (googleIosUrlScheme) {
    return googleIosUrlScheme;
  }

  if (process.env.EAS_BUILD === "true") {
    throw new Error("GOOGLE_AUTH_IOS_URL_SCHEME 환경 변수가 필요합니다.");
  }

  return missingGoogleIosUrlScheme;
}

export default function getAppConfig(): ExpoConfig {
  const googleIosUrlScheme = getGoogleIosUrlScheme();

  return {
    name: "똑딱",
    slug: "ttokttak",
    version: "1.0.3",
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/7b6d8011-8d4c-4110-967f-160aea1db801",
    },
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "ttokttak",
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier: "com.youngzin.ttokttak",
      usesAppleSignIn: true,
      infoPlist: {
        CFBundleDevelopmentRegion: "ko",
        CFBundleLocalizations: ["ko", "en"],
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: iconBackgroundColor,
      },
      predictiveBackGestureEnabled: false,
      package: "com.youngzin.ttokttak",
    },
    web: {
      output: "static",
    },
    extra: {
      eas: {
        projectId: "7b6d8011-8d4c-4110-967f-160aea1db801",
      },
    },
    plugins: [
      "expo-router",
      "expo-localization",
      [
        "expo-build-properties",
        {
          ios: {
            extraPods: [
              { name: "GoogleUtilities", modular_headers: true },
              { name: "RecaptchaInterop", modular_headers: true },
            ],
          },
        },
      ],
      [
        "expo-font",
        {
          android: {
            fonts: [
              {
                fontFamily: "Pretendard",
                fontDefinitions: [
                  {
                    path: "./assets/fonts/pretendard/Pretendard-Regular.otf",
                    weight: 400,
                  },
                  {
                    path: "./assets/fonts/pretendard/Pretendard-Medium.otf",
                    weight: 500,
                  },
                  {
                    path: "./assets/fonts/pretendard/Pretendard-SemiBold.otf",
                    weight: 600,
                  },
                  {
                    path: "./assets/fonts/pretendard/Pretendard-Bold.otf",
                    weight: 700,
                  },
                  {
                    path: "./assets/fonts/pretendard/Pretendard-Black.otf",
                    weight: 900,
                  },
                ],
              },
            ],
          },
          ios: {
            fonts: [
              "./assets/fonts/pretendard/Pretendard-Regular.otf",
              "./assets/fonts/pretendard/Pretendard-Medium.otf",
              "./assets/fonts/pretendard/Pretendard-SemiBold.otf",
              "./assets/fonts/pretendard/Pretendard-Bold.otf",
              "./assets/fonts/pretendard/Pretendard-Black.otf",
            ],
          },
        },
      ],
      [
        "expo-splash-screen",
        {
          backgroundColor: iconBackgroundColor,
          image: "./assets/icon.png",
          imageWidth: 200,
        },
      ],
      "expo-secure-store",
      "expo-apple-authentication",
      "@react-native-community/datetimepicker",
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: googleIosUrlScheme,
        },
      ],
      [
        "@sentry/react-native/expo",
        {
          url: "https://sentry.io/",
          project: "ttokttak",
          organization: "kimyoungzin",
        },
      ],
      "./plugins/with-local-notifications-only",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
}
