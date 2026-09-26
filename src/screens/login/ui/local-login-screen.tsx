import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Pressable, StyleSheet, TextInput } from "react-native";
import { Redirect, router } from "expo-router";

import { isLocalSignInEnabled, signInLocal } from "~/session/local";
import { useThemeColors } from "~/theme/provider";
import { AppScreen } from "~/ui/app-screen";
import { AppText } from "~/ui/app-text";

export function LocalLoginScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSignIn(): Promise<void> {
    if (pending) return;
    Keyboard.dismiss();
    setPending(true);
    setFailed(false);
    try {
      await signInLocal(email.trim(), password);
      router.replace("/");
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  if (!isLocalSignInEnabled()) return <Redirect href="/" />;

  return (
    <AppScreen contentStyle={styles.content}>
      <AppText>{t("login.local.title")}</AppText>
      <TextInput
        accessibilityLabel={t("login.local.email")}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder={t("login.local.email")}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border },
        ]}
        testID="local-email"
        value={email}
      />
      <TextInput
        accessibilityLabel={t("login.local.password")}
        autoCapitalize="none"
        onChangeText={setPassword}
        onSubmitEditing={handleSignIn}
        placeholder={t("login.local.password")}
        returnKeyType="go"
        secureTextEntry
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border },
        ]}
        testID="local-password"
        value={password}
      />
      <Pressable
        accessibilityRole="button"
        disabled={pending}
        onPress={handleSignIn}
        style={styles.input}
        testID="local-sign-in"
      >
        <AppText>{t("login.local.title")}</AppText>
      </Pressable>
      {failed && <AppText>{t("error.tryAgain")}</AppText>}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 16, justifyContent: "center", padding: 24 },
  input: { borderRadius: 8, borderWidth: 1, minHeight: 48, padding: 12 },
});
