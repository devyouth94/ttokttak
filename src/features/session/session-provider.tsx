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
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getDisplayName(user: User): string | null {
  const fullName = user.user_metadata?.full_name;

  return typeof fullName === "string" && fullName.trim()
    ? fullName.trim()
    : (user.email ?? null);
}

function getMetadataDisplayName(user: User): string | null {
  const fullName = user.user_metadata?.full_name;
  return typeof fullName === "string" && fullName.trim()
    ? fullName.trim()
    : null;
}

async function ensureProfile(user: User): Promise<ProfileRow> {
  const client = supabase!;
  const { data: existingProfile, error: fetchError } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existingProfile) {
    const metadataDisplayName = getMetadataDisplayName(user);
    const shouldSyncDisplayName =
      metadataDisplayName &&
      metadataDisplayName !== existingProfile.display_name &&
      (!existingProfile.display_name ||
        existingProfile.display_name === user.email);

    if (!shouldSyncDisplayName) {
      return existingProfile;
    }

    const { data: updatedProfile, error: updateError } = await client
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

  const { data: insertedProfile, error: insertError } = await client
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

    const applySession = async (nextSession: Session | null) => {
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

        await applySession(initialSession);
      } catch (error) {
        setSession(null);
        setProfile(null);
        setErrorMessage(error instanceof Error ? error.message : String(error));
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
      const client = supabase!;
      const { displayName, familyName, givenName, identityToken } =
        await signInWithAppleIdToken();
      const { data, error } = await client.auth.signInWithIdToken({
        provider: "apple",
        token: identityToken,
      });

      if (error) {
        throw error;
      }

      if (displayName || givenName || familyName) {
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
          throw metadataError;
        }
      }

      if (displayName && data.user) {
        await client
          .from("profiles")
          .update({
            display_name: displayName,
          })
          .eq("id", data.user.id);
      }
    },
    async signInWithGoogle() {
      const client = supabase!;
      const token = await signInWithGoogleIdToken();
      const { error } = await client.auth.signInWithIdToken({
        provider: "google",
        token,
      });

      if (error) {
        throw error;
      }
    },
    async signOut() {
      const client = supabase!;
      const { error } = await client.auth.signOut();

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
