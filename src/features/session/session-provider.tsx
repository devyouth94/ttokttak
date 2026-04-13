import type { PropsWithChildren } from "react";
import { createContext, use, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { signInWithAppleIdToken } from "~/features/session/apple-sign-in";
import {
  signInWithGoogleIdToken,
  signOutFromGoogle,
} from "~/features/session/google-sign-in";
import type { ProfileRow } from "~/lib/database.types";
import { isSupabaseConfigured, supabase } from "~/lib/supabase";

type SessionContextValue = {
  errorMessage: string | null;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  profile: ProfileRow | null;
  session: Session | null;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
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

function getMetadataDisplayName(user: User): string | null {
  const fullName = user.user_metadata?.full_name;

  if (typeof fullName !== "string") {
    return null;
  }

  const trimmedValue = fullName.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
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
    const metadataDisplayName = getMetadataDisplayName(user);
    const canSyncDisplayName =
      metadataDisplayName &&
      metadataDisplayName !== existingProfile.display_name &&
      (!existingProfile.display_name ||
        existingProfile.display_name === user.email);

    if (!canSyncDisplayName) {
      return existingProfile;
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: metadataDisplayName,
      })
      .eq("id", user.id)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    return updatedProfile;
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
    async signInWithApple() {
      if (!supabase) {
        throw new Error("Supabase 클라이언트가 설정되지 않았습니다.");
      }

      const client = supabase;
      const { displayName, familyName, givenName, identityToken } =
        await signInWithAppleIdToken();
      const { data, error } = await client.auth.signInWithIdToken({
        provider: "apple",
        token: identityToken,
      });

      if (error) {
        throw error;
      }

      if (!displayName && !givenName && !familyName) {
        return;
      }

      const metadata: Record<string, string> = {};

      if (displayName) {
        metadata.full_name = displayName;
      }

      if (givenName) {
        metadata.given_name = givenName;
      }

      if (familyName) {
        metadata.family_name = familyName;
      }

      const { error: metadataError } = await client.auth.updateUser({
        data: metadata,
      });

      if (metadataError) {
        return;
      }

      if (!displayName || !data.user) {
        return;
      }

      await client
        .from("profiles")
        .update({
          display_name: displayName,
        })
        .eq("id", data.user.id);
    },
    async signInWithGoogle() {
      if (!supabase) {
        throw new Error("Supabase 클라이언트가 설정되지 않았습니다.");
      }

      const token = await signInWithGoogleIdToken();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token,
      });

      if (error) {
        throw error;
      }
    },
    async signOut() {
      if (!supabase) {
        return;
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      await signOutFromGoogle();
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
