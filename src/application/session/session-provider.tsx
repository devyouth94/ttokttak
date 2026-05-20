import type { PropsWithChildren } from "react";
import { createContext, use, useEffect, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

import {
  ensureProfile,
  type ProfileRow,
  updateProfileDisplayName,
} from "~/entities/profile";
import {
  deleteAccount as deleteAccountWithCleanup,
  requestAppleAuthorizationCodeForAccountDeletion,
} from "~/features/delete-account";
import {
  signInWithApple,
  signInWithGoogle,
  signOutFromGoogle,
} from "~/features/sign-in";
import { cancelAllTtokttakLocalReminderNotifications } from "~/features/sync-local-notifications";
import { isSupabaseConfigured, supabase } from "~/shared/api/supabase";

type SessionContextValue = {
  authEvent: AuthChangeEvent | "BOOTSTRAP" | null;
  errorMessage: string | null;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  profile: ProfileRow | null;
  sessionRevision: number;
  session: Session | null;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  user: User | null;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function getAuthProviders(user: User | null | undefined): string[] {
  const providers = user?.app_metadata.providers;

  return Array.isArray(providers)
    ? providers.filter(
        (provider): provider is string => typeof provider === "string"
      )
    : [];
}

function getAuthProvider(user: User | null | undefined): string | null {
  const provider = user?.app_metadata.provider;

  return typeof provider === "string" ? provider : null;
}

export function SessionProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const [authEvent, setAuthEvent] = useState<
    AuthChangeEvent | "BOOTSTRAP" | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionRevision, setSessionRevision] = useState(0);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      setIsLoading(false);
      return;
    }

    const applySession = async (
      nextSession: Session | null,
      nextAuthEvent: AuthChangeEvent | "BOOTSTRAP"
    ) => {
      setAuthEvent(nextAuthEvent);
      setSessionRevision((previous) => previous + 1);
      setSession(nextSession);

      if (!nextSession?.user) {
        setProfile(null);
        setErrorMessage(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const nextProfile = await ensureProfile({
          client,
          user: nextSession.user,
        });

        setProfile(nextProfile);
        setErrorMessage(null);
        setIsLoading(false);
      } catch (error) {
        setProfile(null);
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setIsLoading(false);
      }
    };

    const bootstrap = async () => {
      setIsLoading(true);

      try {
        const {
          data: { session: initialSession },
          error,
        } = await client.auth.getSession();

        if (error) {
          throw error;
        }

        await applySession(initialSession, "BOOTSTRAP");
      } catch (error) {
        setAuthEvent("BOOTSTRAP");
        setSessionRevision((previous) => previous + 1);
        setSession(null);
        setProfile(null);
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setIsLoading(false);
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((nextAuthEvent, nextSession) => {
      void applySession(nextSession, nextAuthEvent);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: SessionContextValue = {
    authEvent,
    errorMessage,
    isAuthenticated: Boolean(session?.user),
    isConfigured: isSupabaseConfigured,
    isLoading,
    profile,
    sessionRevision,
    session,
    async signInWithApple() {
      const client = supabase!;
      await signInWithApple({ client });
    },
    async signInWithGoogle() {
      const client = supabase!;
      await signInWithGoogle({ client });
    },
    async signOut() {
      const client = supabase!;
      const { error } = await client.auth.signOut();

      if (error) {
        throw error;
      }

      await signOutFromGoogle();
    },
    async deleteAccount() {
      const client = supabase!;

      await deleteAccountWithCleanup({
        cancelAllTtokttakLocalReminderNotifications,
        client,
        currentAuthProvider: getAuthProvider(session?.user),
        currentAuthProviders: getAuthProviders(session?.user),
        currentUserId: session?.user.id,
        requestAppleAuthorizationCodeForAccountDeletion,
        signOutFromGoogle,
      });
    },
    async updateDisplayName(displayName: string) {
      const client = supabase!;
      const userId = session?.user.id;

      if (!userId) {
        throw new Error("로그인이 필요합니다.");
      }

      const data = await updateProfileDisplayName({
        client,
        displayName,
        userId,
      });

      setProfile(data);
    },
    user: session?.user ?? null,
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const context = use(SessionContext);

  if (!context) {
    throw new Error(
      "SessionProvider 내부에서만 useSession을 사용할 수 있습니다."
    );
  }

  return context;
}
