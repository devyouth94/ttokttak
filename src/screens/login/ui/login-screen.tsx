import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

import { getErrorMessage } from "~/errors";
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "~/legal";
import { useSession } from "~/session/provider";
import { useThemeColors } from "~/theme/provider";
import { AppScreen } from "~/ui/app-screen";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing, typography } from "~/ui/tokens";

import { AppLogoIcon } from "./app-logo-icon";
import { AppleLogoIcon, GoogleLogoIcon } from "./social-icons";

export function LoginScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();

  const { signInApple, signInGoogle, status } = useSession();

  const [appleAvailable, setAppleAvailable] = useState(false);

  const legalSuffix = t("login.legalSuffix");

  function handleGoogleSignIn(): void {
    void signInGoogle().catch((error) => {
      Alert.alert(t("login.googleSignInErrorTitle"), getErrorMessage(error));
    });
  }

  function handleAppleSignIn(): void {
    void signInApple().catch((error) => {
      Alert.alert(t("login.appleSignInErrorTitle"), getErrorMessage(error));
    });
  }

  function openLegalDocument(
    url: string,
    titleKey: string,
    messageKey: string
  ): void {
    void Linking.openURL(url).catch(() => {
      Alert.alert(t(titleKey), t(messageKey));
    });
  }

  useEffect(() => {
    if (
      Platform.OS !== "ios" ||
      (status !== "error" && status !== "signedOut")
    ) {
      return;
    }

    void AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, [status]);

  return (
    <AppScreen
      contentStyle={[
        styles.screenContent,
        { backgroundColor: themeColors.surface },
      ]}
      safeAreaStyle={{ backgroundColor: themeColors.surface }}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <AppLogoIcon size={48} />
            <AppText style={styles.brand}>{t("app.name")}</AppText>
          </View>

          <View style={styles.loginArea}>
            <View style={styles.actions}>
              <Pressable
                accessibilityHint={t("login.googleHint")}
                accessibilityRole="button"
                onPress={handleGoogleSignIn}
                style={({ pressed }) => [
                  styles.socialButton,
                  {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.border,
                    shadowColor: themeColors.shadow,
                  },
                  pressed && styles.pressedButton,
                ]}
              >
                <GoogleLogoIcon />
                <AppText
                  style={[styles.buttonText, { color: themeColors.text }]}
                >
                  {t("login.googleButton")}
                </AppText>
              </Pressable>

              {appleAvailable && (
                <Pressable
                  accessibilityHint={t("login.appleHint")}
                  accessibilityRole="button"
                  onPress={handleAppleSignIn}
                  style={({ pressed }) => [
                    styles.socialButton,
                    {
                      backgroundColor: themeColors.primary,
                      borderColor: themeColors.primary,
                      shadowColor: themeColors.shadow,
                    },
                    pressed && styles.applePressedButton,
                  ]}
                >
                  <AppleLogoIcon size={17} />
                  <AppText
                    style={[
                      styles.buttonText,
                      { color: themeColors.primaryForeground },
                    ]}
                  >
                    {t("login.appleButton")}
                  </AppText>
                </Pressable>
              )}
            </View>

            <View style={styles.legalRow}>
              <AppText
                style={[styles.legalText, { color: themeColors.textSoft }]}
              >
                {t("login.legalPrefix")}
              </AppText>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() =>
                  openLegalDocument(
                    TERMS_OF_SERVICE_URL,
                    "login.termsOpenErrorTitle",
                    "login.termsOpenErrorMessage"
                  )
                }
                style={({ pressed }) => [
                  styles.legalLinkButton,
                  pressed && styles.legalLinkPressed,
                ]}
              >
                <AppText
                  style={[
                    styles.legalText,
                    styles.legalLink,
                    { color: themeColors.text },
                  ]}
                >
                  {t("login.legalTerms")}
                </AppText>
              </Pressable>
              <AppText
                style={[styles.legalText, { color: themeColors.textSoft }]}
              >
                {t("login.legalAnd")}
              </AppText>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() =>
                  openLegalDocument(
                    PRIVACY_POLICY_URL,
                    "login.privacyOpenErrorTitle",
                    "login.privacyOpenErrorMessage"
                  )
                }
                style={({ pressed }) => [
                  styles.legalLinkButton,
                  pressed && styles.legalLinkPressed,
                ]}
              >
                <AppText
                  style={[
                    styles.legalText,
                    styles.legalLink,
                    { color: themeColors.text },
                  ]}
                >
                  {t("login.legalPrivacy")}
                </AppText>
              </Pressable>
              {legalSuffix && (
                <AppText
                  style={[styles.legalText, { color: themeColors.textSoft }]}
                >
                  {legalSuffix}
                </AppText>
              )}
            </View>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.xs, width: "100%" },
  applePressedButton: { opacity: 0.92 },
  brand: {
    fontSize: 18,
    fontWeight: typography.fontWeight.black,
    letterSpacing: 0,
    lineHeight: 24,
    textAlign: "center",
  },
  buttonText: { fontSize: typography.body, lineHeight: 22 },
  container: { flex: 1, justifyContent: "center" },
  content: { gap: spacing.xl },
  header: { alignItems: "center", gap: spacing.xs },
  legalLink: {
    fontWeight: typography.fontWeight.semibold,
    textDecorationLine: "underline",
  },
  legalLinkButton: { borderRadius: borderRadius.xs },
  legalLinkPressed: { opacity: 0.72 },
  legalRow: {
    alignItems: "center",
    columnGap: spacing.xxs,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    rowGap: spacing.xxs,
  },
  legalText: {
    fontSize: typography.label,
    lineHeight: 18,
    textAlign: "center",
  },
  loginArea: { gap: spacing.sm },
  pressedButton: { opacity: 0.82 },
  screenContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  socialButton: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    height: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
});
