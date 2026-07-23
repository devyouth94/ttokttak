import type { PropsWithChildren } from "react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";

import { deleteAccount } from "~/account/delete";
import {
  prepareProfile,
  type Profile,
  updateName as saveName,
} from "~/account/profile";
import { captureException } from "~/sentry";
import { supabase } from "~/supabase";

import { signInApple } from "./apple";
import { signInGoogle, signOutGoogle } from "./google";

type SessionStatus = "error" | "loading" | "ready" | "signedOut";

type SessionValue = {
  deleteAccount: () => Promise<void>;
  profile: Profile | null;
  retry: () => Promise<void>;
  signInApple: () => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  status: SessionStatus;
  updateName: (name: string) => Promise<void>;
  user: User | null;
};

const SessionContext = createContext<SessionValue | null>(null);

/** Supabase 세션과 앱에서 필요한 사용자 프로필을 하나의 준비 상태로 관리한다. */
export function SessionProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const requestRef = useRef(0);

  const loadProfile = useCallback(async (nextUser: User): Promise<void> => {
    const request = ++requestRef.current;

    setStatus("loading");

    try {
      const nextProfile = await prepareProfile(nextUser);

      // 세션이 바뀐 뒤 늦게 끝난 이전 요청은 현재 사용자에게 적용하지 않는다.
      if (request !== requestRef.current) {
        return;
      }

      setProfile(nextProfile);
      setStatus("ready");
    } catch (error) {
      if (request !== requestRef.current) {
        return;
      }

      setProfile(null);
      setStatus("error");
      captureException(error, {
        tags: { feature: "session-profile" },
      });
    }
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUser = nextSession?.user ?? null;

      setUser(nextUser);

      if (!nextUser) {
        requestRef.current += 1;
        setProfile(null);
        setStatus("signedOut");
        return;
      }

      setProfile((current) => (current?.id === nextUser.id ? current : null));
      void loadProfile(nextUser);
    });

    return () => {
      requestRef.current += 1;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value: SessionValue = {
    status,
    user,
    profile,
    signInApple,
    signInGoogle,
    retry: () => (user ? loadProfile(user) : Promise.resolve()),
    signOut: async () => {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      await signOutGoogle();
    },
    updateName: async (name: string) => {
      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      setProfile(await saveName(user.id, name));
    },
    deleteAccount: () => deleteAccount(user),
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}

/** 현재 세션의 준비 상태와 사용자 동작을 반환한다. */
export function useSession(): SessionValue {
  const session = use(SessionContext);

  if (!session) {
    throw new Error("SessionProvider 안에서만 세션을 사용할 수 있습니다.");
  }

  return session;
}
