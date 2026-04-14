import type { ExpoConfig } from "expo/config";

const googleIosUrlScheme = process.env.GOOGLE_AUTH_IOS_URL_SCHEME!;

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
        backgroundColor: "#ffffff",
      },
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
          fonts: ["./assets/fonts/goorm-sans-code.ttf"],
        },
      ],
      [
        "expo-splash-screen",
        {
          backgroundColor: "#ffffff",
          image: "./assets/splash.png",
          imageWidth: 200,
        },
      ],
      "expo-secure-store",
      "expo-notifications",
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
