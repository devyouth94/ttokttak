export const appI18nResources = {
  en: {
    translation: {
      app: {
        name: "ttokttak",
      },
      login: {
        appleButton: "Continue with Apple",
        appleHint: "Sign in with your Apple account.",
        appleSignInErrorTitle: "Apple sign-in failed",
        googleButton: "Continue with Google",
        googleHint: "Sign in with your Google account.",
        googleSignInErrorTitle: "Google sign-in failed",
        legalAnd: "and",
        legalPrefix: "By signing in, you agree to the",
        legalPrivacy: "Privacy Policy",
        legalSuffix: "",
        legalTerms: "Terms of Service",
        noticeSupabase:
          "Supabase configuration is required before sign-in can connect.",
        privacyOpenErrorMessage: "Could not open the Privacy Policy.",
        privacyOpenErrorTitle: "Privacy Policy unavailable",
        termsOpenErrorMessage: "Could not open the Terms of Service.",
        termsOpenErrorTitle: "Terms of Service unavailable",
      },
      navigation: {
        createItemHint: "Open the item creation screen.",
        createItemLabel: "Add item",
        tabs: {
          calendar: "Calendar",
          home: "Home",
          schedule: "Items",
          settings: "Settings",
        },
      },
    },
  },
  ko: {
    translation: {
      app: {
        name: "똑딱",
      },
      login: {
        appleButton: "Apple로 로그인",
        appleHint: "Apple 계정으로 로그인",
        appleSignInErrorTitle: "Apple 로그인 실패",
        googleButton: "Google로 로그인",
        googleHint: "Google 계정으로 로그인",
        googleSignInErrorTitle: "Google 로그인 실패",
        legalAnd: "및",
        legalPrefix: "로그인하면",
        legalPrivacy: "개인정보처리방침",
        legalSuffix: "에 동의하게 됩니다.",
        legalTerms: "이용약관",
        noticeSupabase: "로그인 연결을 위해 Supabase 설정이 먼저 필요합니다.",
        privacyOpenErrorMessage: "개인정보처리방침을 열 수 없습니다.",
        privacyOpenErrorTitle: "개인정보처리방침 열기 실패",
        termsOpenErrorMessage: "이용약관을 열 수 없습니다.",
        termsOpenErrorTitle: "이용약관 열기 실패",
      },
      navigation: {
        createItemHint: "일정 만들기 화면으로 이동해요.",
        createItemLabel: "일정 추가",
        tabs: {
          calendar: "캘린더",
          home: "홈",
          schedule: "목록",
          settings: "설정",
        },
      },
    },
  },
} as const;
