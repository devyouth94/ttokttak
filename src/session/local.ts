import { supabase } from "~/supabase";

export function isLocalSignInEnabled(): boolean {
  return (
    __DEV__ &&
    /^http:\/\/(127\.0\.0\.1|localhost|10\.0\.2\.2):54321\/?$/.test(
      process.env.EXPO_PUBLIC_SUPABASE_URL ?? ""
    )
  );
}

export async function signInLocal(
  email: string,
  password: string
): Promise<void> {
  if (!isLocalSignInEnabled()) {
    throw new Error("로컬 개발 환경에서만 테스트 로그인할 수 있습니다.");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
