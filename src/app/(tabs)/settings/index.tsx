import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "~/design-system/tokens";
import { useSession } from "~/features/session/session-provider";

export default function SettingsTabPage(): React.JSX.Element {
  const { signOut, user } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut(): Promise<void> {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut();
    } catch (error) {
      Alert.alert(
        "로그아웃 실패",
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <View style={styles.content}>
        <View style={styles.header}>
          <AppText style={styles.title} variant="display">
            설정
          </AppText>
          <AppText style={styles.description}>
            현재 계정 상태를 확인하고 로그아웃할 수 있습니다.
          </AppText>
        </View>

        <View style={styles.card}>
          <AppText style={styles.sectionLabel} variant="label">
            계정
          </AppText>
          <AppText style={styles.emailText}>
            {user?.email ?? "로그인된 계정 이메일이 없습니다."}
          </AppText>

          <Pressable
            accessibilityLabel="로그아웃"
            accessibilityRole="button"
            disabled={isSigningOut}
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutButton,
              isSigningOut ? styles.signOutButtonDisabled : undefined,
              pressed && !isSigningOut
                ? styles.signOutButtonPressed
                : undefined,
            ]}
          >
            {isSigningOut ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <AppText style={styles.signOutButtonText}>로그아웃</AppText>
            )}
          </Pressable>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.outlineSoft,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  content: {
    flex: 1,
    gap: spacing.xl,
    paddingTop: spacing.xl,
  },
  description: {
    color: colors.textMuted,
  },
  emailText: {
    fontSize: typography.body,
    lineHeight: 22,
  },
  header: {
    gap: spacing.sm,
  },
  screenContent: {
    paddingHorizontal: spacing.lg,
  },
  sectionLabel: {
    color: colors.textMuted,
  },
  signOutButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  signOutButtonPressed: {
    opacity: 0.85,
  },
  signOutButtonText: {
    color: colors.primaryForeground,
    fontSize: typography.body,
    lineHeight: 20,
  },
  title: {
    color: colors.text,
  },
});
