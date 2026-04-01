import type { PropsWithChildren } from "react";
import { createContext, use, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import type { ProfileRow } from "~/lib/database.types";
import { isSupabaseConfigured, supabase } from "~/lib/supabase";

type SessionContextValue = {
  errorMessage: string | null;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  profile: ProfileRow | null;
  session: Session | null;
  signOut: () => Promise<void>;
  user: User | null;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function getDeviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function getDisplayName(user: User): string | null {
  const fullName = user.user_metadata?.full_name;

  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim();
  }

  if (typeof user.email === "string" && user.email.length > 0) {
    return user.email;
  }

  return null;
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

async function ensureProfile(user: User): Promise<ProfileRow | null> {
  if (!supabase) {
    return null;
  }

  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existingProfile) {
    return existingProfile;
  }

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      timezone: getDeviceTimeZone(),
      display_name: getDisplayName(user),
    })
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  return insertedProfile;
}

export function SessionProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const applySession = async (nextSession: Session | null) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);

      if (!nextSession?.user) {
        setProfile(null);
        setErrorMessage(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const nextProfile = await ensureProfile(nextSession.user);

        if (!isMounted) {
          return;
        }

        setProfile(nextProfile);
        setErrorMessage(null);
        setIsLoading(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setProfile(null);
        setErrorMessage(
          getErrorMessage(error, "프로필을 불러오는 중 오류가 발생했습니다.")
        );
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

        await applySession(initialSession);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSession(null);
        setProfile(null);
        setErrorMessage(
          getErrorMessage(error, "세션을 복원하는 중 오류가 발생했습니다.")
        );
        setIsLoading(false);
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: SessionContextValue = {
    errorMessage,
    isAuthenticated: Boolean(session?.user),
    isConfigured: isSupabaseConfigured,
    isLoading,
    profile,
    session,
    async signOut() {
      if (!supabase) {
        return;
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
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
