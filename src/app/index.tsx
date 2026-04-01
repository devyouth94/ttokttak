import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "~/features/session/session-provider";

export default function IndexScreen() {
  const {
    errorMessage,
    isAuthenticated,
    isConfigured,
    isLoading,
    profile,
    signOut,
    user,
  } = useSession();

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
    <View style={styles.container}>
      <Text style={styles.title}>똑딱</Text>
      <Text style={styles.subtitle}>
        2단계 세션/프로필 부트스트랩 확인 화면
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Supabase 설정</Text>
        <Text style={styles.value}>
          {isConfigured
            ? "연결 정보가 준비되었습니다."
            : "환경 변수가 필요합니다."}
        </Text>
        {!isConfigured ? (
          <Text style={styles.description}>
            `.env`에 `EXPO_PUBLIC_SUPABASE_URL`과
            `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 설정하세요.
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>세션 상태</Text>
        <Text style={styles.value}>
          {isLoading
            ? "세션을 확인하는 중입니다."
            : isAuthenticated
              ? "세션이 복원되었습니다."
              : "현재 로그인된 세션이 없습니다."}
        </Text>
        {user?.email ? (
          <Text style={styles.description}>이메일: {user.email}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>프로필 상태</Text>
        <Text style={styles.value}>
          {profile
            ? "프로필과 시간대가 준비되었습니다."
            : isAuthenticated
              ? "프로필을 불러오는 중이거나 아직 생성되지 않았습니다."
              : "로그인 후 자동으로 생성됩니다."}
        </Text>
        {profile ? (
          <>
            <Text style={styles.description}>
              표시 이름: {profile.display_name ?? "없음"}
            </Text>
            <Text style={styles.description}>시간대: {profile.timezone}</Text>
          </>
        ) : null}
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>오류</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {isAuthenticated ? (
        <Pressable onPress={handleSignOut} style={styles.button}>
          <Text style={styles.buttonText}>로그아웃</Text>
        </Pressable>
      ) : (
        <Text style={styles.footnote}>
          로그인 화면과 인증 액션은 9단계에서 추가합니다.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: "#111827",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  container: {
    flex: 1,
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "#f3f4f6",
  },
  card: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 18,
    gap: 8,
  },
  description: {
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 20,
  },
  errorCard: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#fef2f2",
    padding: 18,
    gap: 6,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 14,
    lineHeight: 20,
  },
  errorTitle: {
    color: "#7f1d1d",
    fontSize: 15,
    fontWeight: "700",
  },
  footnote: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  label: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  subtitle: {
    color: "#4b5563",
    fontSize: 15,
    textAlign: "center",
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
  },
  value: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
  },
});
