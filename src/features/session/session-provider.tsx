import type { PropsWithChildren } from "react";
import { createContext, use, useEffect, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

import { cancelAllTtokttakLocalReminderNotifications } from "~/features/notifications/local-notification-sync";
import { deleteAccount as deleteAccountWithCleanup } from "~/features/session/account-deletion";
import { signInWithAppleIdToken } from "~/features/session/apple-sign-in";
import {
  signInWithGoogleIdToken,
  signOutFromGoogle,
} from "~/features/session/google-sign-in";
import type { ProfileRow } from "~/lib/database.types";
import { isSupabaseConfigured, supabase } from "~/lib/supabase";

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

function getDeviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
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
      !existingProfile.display_name;

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
      display_name: getMetadataDisplayName(user),
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
    async deleteAccount() {
      const client = supabase!;

      await deleteAccountWithCleanup({
        cancelAllTtokttakLocalReminderNotifications,
        client,
        currentUserId: session?.user.id,
        signOutFromGoogle,
      });
    },
    async updateDisplayName(displayName: string) {
      const client = supabase!;
      const userId = session?.user.id;

      if (!userId) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data, error } = await client
        .from("profiles")
        .update({
          display_name: displayName.trim(),
        })
        .eq("id", userId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

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
