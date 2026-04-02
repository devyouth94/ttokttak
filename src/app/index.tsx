import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppCard } from "~/design-system/components/app-card";
import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import { borderRadius, colors, spacing } from "~/design-system/tokens";
import { LoginScreen } from "~/features/session/components/login-screen";
import { useSession } from "~/features/session/session-provider";

export default function IndexScreen() {
  const {
    errorMessage,
    isAuthenticated,
    isConfigured,
    isLoading,
    profile,
    signInWithGoogle,
    signOut,
    user,
  } = useSession();

  if (!isAuthenticated) {
    return (
      <LoginScreen
        isConfigured={isConfigured}
        onGooglePress={signInWithGoogle}
      />
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "로그아웃 중 오류가 발생했습니다.";

      Alert.alert("로그아웃 실패", message);
    }
  };

  return (
    <AppScreen>
      <AppText style={styles.title} variant="display">
        똑딱
      </AppText>
      <AppText style={styles.subtitle}>
        2단계 세션/프로필 부트스트랩 확인 화면
      </AppText>

      <AppCard>
        <AppText variant="label">Supabase 설정</AppText>
        <AppText variant="title">
          {isConfigured
            ? "연결 정보가 준비되었습니다."
            : "환경 변수가 필요합니다."}
        </AppText>
        {!isConfigured ? (
          <AppText style={styles.description}>
            `.env.local`에 Supabase 값과
            `EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID`를 설정하세요.
          </AppText>
        ) : null}
      </AppCard>

      <AppCard>
        <AppText variant="label">세션 상태</AppText>
        <AppText variant="title">
          {isLoading
            ? "세션을 확인하는 중입니다."
            : isAuthenticated
              ? "세션이 복원되었습니다."
              : "현재 로그인된 세션이 없습니다."}
        </AppText>
        {user?.email ? (
          <AppText style={styles.description}>이메일: {user.email}</AppText>
        ) : null}
      </AppCard>

      <AppCard>
        <AppText variant="label">프로필 상태</AppText>
        <AppText variant="title">
          {profile
            ? "프로필과 시간대가 준비되었습니다."
            : isAuthenticated
              ? "프로필을 불러오는 중이거나 아직 생성되지 않았습니다."
              : "로그인 후 자동으로 생성됩니다."}
        </AppText>
        {profile ? (
          <>
            <AppText style={styles.description}>
              표시 이름: {profile.display_name ?? "없음"}
            </AppText>
            <AppText style={styles.description}>
              시간대: {profile.timezone}
            </AppText>
          </>
        ) : null}
      </AppCard>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <AppText style={styles.errorTitle} variant="title">
            오류
          </AppText>
          <AppText style={styles.errorText}>{errorMessage}</AppText>
        </View>
      ) : null}

      <Pressable onPress={handleSignOut} style={styles.button}>
        <AppText style={styles.buttonText}>로그아웃</AppText>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: borderRadius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: 15,
  },
  description: {
    color: colors.textMuted,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  title: {
    textAlign: "center",
  },
  errorCard: {
    width: "100%",
    gap: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.errorContainer,
    padding: spacing.lg,
  },
  errorText: {
    color: colors.error,
  },
  errorTitle: {
    color: colors.error,
  },
});
