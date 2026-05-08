import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { AppLogoIcon } from "~/design-system/components/app-logo-icon";
import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import {
  AppleLogoIcon,
  GoogleLogoIcon,
} from "~/design-system/components/social-icons";
import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "~/design-system/tokens";
import {
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from "~/features/legal/legal-links";
import { isAppleSignInAvailable } from "~/features/session/apple-sign-in";

type LoginScreenProps = {
  isConfigured: boolean;
  onApplePress: () => Promise<void>;
  onGooglePress: () => Promise<void>;
};

export function LoginScreen({
  isConfigured,
  onApplePress,
  onGooglePress,
}: LoginScreenProps): React.JSX.Element {
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
        "Google 로그인 실패",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  const handleApplePress = async () => {
    try {
      await onApplePress();
    } catch (error) {
      Alert.alert(
        "Apple 로그인 실패",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  const handleOpenPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert(
        "개인정보처리방침 열기 실패",
        "개인정보처리방침을 열 수 없습니다."
      );
    }
  };

  const handleOpenTermsOfService = async () => {
    try {
      await Linking.openURL(TERMS_OF_SERVICE_URL);
    } catch {
      Alert.alert("이용약관 열기 실패", "이용약관을 열 수 없습니다.");
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
            <AppText style={styles.brand}>똑딱</AppText>
          </View>

          <View style={styles.loginArea}>
            <View style={styles.actions}>
              <Pressable
                accessibilityHint="Google 계정으로 로그인"
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
                  Google로 로그인
                </AppText>
              </Pressable>

              {isAppleAvailable ? (
                <Pressable
                  accessibilityHint="Apple 계정으로 로그인"
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
                    Apple로 로그인
                  </AppText>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.legalRow}>
              <AppText style={styles.legalText}>로그인하면</AppText>
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
                  이용약관
                </AppText>
              </Pressable>
              <AppText style={styles.legalText}>및</AppText>
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
                  개인정보처리방침
                </AppText>
              </Pressable>
              <AppText style={styles.legalText}>에 동의하게 됩니다.</AppText>
            </View>
          </View>

          {!isConfigured ? (
            <AppText style={styles.notice}>
              로그인 연결을 위해 Supabase 설정이 먼저 필요합니다.
            </AppText>
          ) : null}
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.xs,
    width: "100%",
  },
  appleButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  appleButtonText: {
    color: colors.primaryForeground,
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
    backgroundColor: colors.surface,
    borderColor: colors.dividerOnPrimary,
  },
  googleButtonText: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  header: {
    alignItems: "center",
    gap: spacing.xs,
  },
  legalLink: {
    color: colors.text,
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
    color: colors.textSoft,
    fontSize: typography.label,
    lineHeight: 18,
    textAlign: "center",
  },
  loginArea: {
    gap: spacing.sm,
  },
  notice: {
    color: colors.textMuted,
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
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  screenContent: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  screen: {
    backgroundColor: colors.surface,
  },
});
