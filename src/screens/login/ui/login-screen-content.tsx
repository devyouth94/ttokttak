import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "~/features/legal";
import { isAppleSignInAvailable } from "~/features/sign-in";
import { AppLogoIcon } from "~/shared/ui/app-logo-icon";
import { AppScreen } from "~/shared/ui/app-screen";
import { AppText } from "~/shared/ui/app-text";
import { AppleLogoIcon, GoogleLogoIcon } from "~/shared/ui/social-icons";
import { borderRadius, spacing, typography } from "~/shared/ui/tokens";
import type { ThemeColors } from "~/theme/colors";
import { useThemeColors } from "~/theme/context";

type LoginScreenContentProps = {
  isConfigured: boolean;
  onApplePress: () => Promise<void>;
  onGooglePress: () => Promise<void>;
};

export function LoginScreenContent({
  isConfigured,
  onApplePress,
  onGooglePress,
}: LoginScreenContentProps): React.JSX.Element {
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const styles = useMemo(
    () => createLoginScreenStyles(themeColors),
    [themeColors]
  );
  const legalSuffix = t("login.legalSuffix");
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") {
      setIsAppleAvailable(false);
      return;
    }

    const checkAvailability = async () => {
      const isAvailable = await isAppleSignInAvailable();
      setIsAppleAvailable(isAvailable);
    };

    void checkAvailability();
  }, []);

  const handleGooglePress = async () => {
    try {
      await onGooglePress();
    } catch (error) {
      Alert.alert(
        t("login.googleSignInErrorTitle"),
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  const handleApplePress = async () => {
    try {
      await onApplePress();
    } catch (error) {
      Alert.alert(
        t("login.appleSignInErrorTitle"),
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  const handleOpenPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert(
        t("login.privacyOpenErrorTitle"),
        t("login.privacyOpenErrorMessage")
      );
    }
  };

  const handleOpenTermsOfService = async () => {
    try {
      await Linking.openURL(TERMS_OF_SERVICE_URL);
    } catch {
      Alert.alert(
        t("login.termsOpenErrorTitle"),
        t("login.termsOpenErrorMessage")
      );
    }
  };

  return (
    <AppScreen
      contentStyle={styles.screenContent}
      safeAreaStyle={styles.screen}
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
                disabled={!isConfigured}
                onPress={handleGooglePress}
                style={({ pressed }) => [
                  styles.socialButton,
                  styles.googleButton,
                  !isConfigured && styles.disabledButton,
                  pressed && isConfigured && styles.pressedButton,
                ]}
              >
                <GoogleLogoIcon />
                <AppText style={styles.googleButtonText}>
                  {t("login.googleButton")}
                </AppText>
              </Pressable>

              {isAppleAvailable && (
                <Pressable
                  accessibilityHint={t("login.appleHint")}
                  accessibilityRole="button"
                  disabled={!isConfigured}
                  onPress={handleApplePress}
                  style={({ pressed }) => [
                    styles.socialButton,
                    styles.appleButton,
                    !isConfigured && styles.disabledButton,
                    pressed && isConfigured && styles.applePressedButton,
                  ]}
                >
                  <AppleLogoIcon size={17} />
                  <AppText style={styles.appleButtonText}>
                    {t("login.appleButton")}
                  </AppText>
                </Pressable>
              )}
            </View>

            <View style={styles.legalRow}>
              <AppText style={styles.legalText}>
                {t("login.legalPrefix")}
              </AppText>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => {
                  void handleOpenTermsOfService();
                }}
                style={({ pressed }) => [
                  styles.legalLinkButton,
                  pressed ? styles.legalLinkPressed : undefined,
                ]}
              >
                <AppText style={[styles.legalText, styles.legalLink]}>
                  {t("login.legalTerms")}
                </AppText>
              </Pressable>
              <AppText style={styles.legalText}>{t("login.legalAnd")}</AppText>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => {
                  void handleOpenPrivacyPolicy();
                }}
                style={({ pressed }) => [
                  styles.legalLinkButton,
                  pressed ? styles.legalLinkPressed : undefined,
                ]}
              >
                <AppText style={[styles.legalText, styles.legalLink]}>
                  {t("login.legalPrivacy")}
                </AppText>
              </Pressable>
              {legalSuffix && (
                <AppText style={styles.legalText}>{legalSuffix}</AppText>
              )}
            </View>
          </View>

          {!isConfigured && (
            <AppText style={styles.notice}>{t("login.noticeSupabase")}</AppText>
          )}
        </View>
      </View>
    </AppScreen>
  );
}

function createLoginScreenStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
    actions: {
      gap: spacing.xs,
      width: "100%",
    },
    appleButton: {
      backgroundColor: themeColors.primary,
      borderColor: themeColors.primary,
    },
    appleButtonText: {
      color: themeColors.primaryForeground,
      fontSize: typography.body,
      lineHeight: 22,
    },
    applePressedButton: {
      opacity: 0.92,
    },
    brand: {
      fontSize: 18,
      fontWeight: typography.fontWeight.black,
      letterSpacing: 0,
      lineHeight: 24,
      textAlign: "center",
    },
    container: {
      flex: 1,
      justifyContent: "center",
    },
    content: {
      gap: spacing.xl,
    },
    disabledButton: {
      opacity: 0.45,
    },
    googleButton: {
      backgroundColor: themeColors.surface,
      borderColor: themeColors.border,
    },
    googleButtonText: {
      color: themeColors.text,
      fontSize: typography.body,
      lineHeight: 22,
    },
    header: {
      alignItems: "center",
      gap: spacing.xs,
    },
    legalLink: {
      color: themeColors.text,
      fontWeight: typography.fontWeight.semibold,
      textDecorationLine: "underline",
    },
    legalLinkButton: {
      borderRadius: borderRadius.xs,
    },
    legalLinkPressed: {
      opacity: 0.72,
    },
    legalRow: {
      alignItems: "center",
      columnGap: spacing.xxs,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      rowGap: spacing.xxs,
    },
    legalText: {
      color: themeColors.textSoft,
      fontSize: typography.label,
      lineHeight: 18,
      textAlign: "center",
    },
    loginArea: {
      gap: spacing.sm,
    },
    notice: {
      color: themeColors.textMuted,
      fontSize: typography.label,
      lineHeight: 18,
      textAlign: "center",
    },
    pressedButton: {
      opacity: 0.82,
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
      shadowColor: themeColors.shadow,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 1,
      shadowRadius: 20,
    },
    screenContent: {
      backgroundColor: themeColors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
    },
    screen: {
      backgroundColor: themeColors.surface,
    },
  });
}
