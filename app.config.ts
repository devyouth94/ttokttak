import type { ExpoConfig } from "expo/config";

const googleIosUrlScheme = process.env.GOOGLE_AUTH_IOS_URL_SCHEME!;
const iconBackgroundColor = "#FCF2E4";

export default function getAppConfig(): ExpoConfig {
  return {
    name: "똑딱",
    slug: "ttokttak",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "ttokttak",
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier: "com.youngzin.ttokttak",
      usesAppleSignIn: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: iconBackgroundColor,
      },
      googleServicesFile: "./.google/google-services.json",
      predictiveBackGestureEnabled: false,
      package: "com.youngzin.ttokttak",
    },
    web: {
      output: "static",
    },
    plugins: [
      "expo-router",
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
            ],
          },
        },
      ],
      [
        "expo-splash-screen",
        {
          backgroundColor: iconBackgroundColor,
          image: "./assets/splash.png",
          imageWidth: 200,
        },
      ],
      "expo-secure-store",
      [
        "expo-notifications",
        {
          defaultChannel: "reminders",
        },
      ],
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
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
}
