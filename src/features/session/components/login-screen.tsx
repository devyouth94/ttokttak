import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, View } from "react-native";

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

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText style={styles.brand}>ttokttak</AppText>
          <AppText style={styles.subtitle}>
            번거로운 가입 없이 소셜 로그인으로 바로 시작하세요.
          </AppText>
        </View>

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
            <AppText style={styles.googleButtonText}>Google로 로그인</AppText>
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
              <AppText style={styles.appleButtonText}>Apple로 로그인</AppText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.footer}>
          {!isConfigured ? (
            <AppText style={styles.notice}>
              로그인 연결을 위해 Supabase 설정이 먼저 필요합니다.
            </AppText>
          ) : null}
          <AppText style={styles.legal}>
            계속 진행하면 약관 및 개인정보 처리방침에 동의하게 됩니다.
          </AppText>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
    width: "100%",
  },
  appleButton: {
    backgroundColor: "#111111",
    borderColor: "#111111",
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
    fontSize: 34,
    letterSpacing: -0.8,
    lineHeight: 40,
    textAlign: "center",
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.md,
    paddingTop: spacing.xxl,
  },
  disabledButton: {
    opacity: 0.45,
  },
  footer: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  googleButton: {
    backgroundColor: colors.surface,
    borderColor: colors.outlineSoft,
  },
  googleButtonText: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  header: {
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  legal: {
    color: colors.textSoft,
    fontSize: typography.label,
    lineHeight: 18,
    textAlign: "center",
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
    justifyContent: "center",
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24,
    maxWidth: 260,
    textAlign: "center",
  },
  screenContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
});
