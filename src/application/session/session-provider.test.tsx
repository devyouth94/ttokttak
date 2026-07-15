import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { ensureProfile, type ProfileRow } from "~/entities/profile";
import { supabase } from "~/shared/api/supabase";

import { SessionProvider } from "./session-provider";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useEffect: jest.fn(),
  useState: jest.fn(),
}));
jest.mock("~/entities/profile", () => ({
  ensureProfile: jest.fn(),
  updateProfileDisplayName: jest.fn(),
}));
jest.mock("~/features/delete-account", () => ({
  deleteAccount: jest.fn(),
  requestAppleAuthorizationCodeForAccountDeletion: jest.fn(),
}));
jest.mock("~/features/sign-in", () => ({
  signInWithApple: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOutFromGoogle: jest.fn(),
}));
jest.mock("~/features/sync-local-notifications", () => ({
  cancelAllTtokttakLocalReminderNotifications: jest.fn(),
}));
jest.mock("~/shared/api/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
    },
  },
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

function createSession(userId: string): Session {
  return {
    access_token: "access-token",
    expires_in: 3600,
    refresh_token: "refresh-token",
    token_type: "bearer",
    user: {
      app_metadata: {},
      aud: "authenticated",
      created_at: "2026-07-13T00:00:00.000Z",
      id: userId,
      user_metadata: {},
    },
  };
}

function createProfile(userId: string): ProfileRow {
  return {
    created_at: "2026-07-13T00:00:00.000Z",
    display_name: null,
    id: userId,
    timezone: "Asia/Seoul",
    updated_at: "2026-07-13T00:00:00.000Z",
  };
}

describe("SessionProvider", () => {
  it("늦게 완료된 이전 세션의 profile을 적용하지 않는다", async () => {
    const stateSetters: jest.Mock[] = [];
    const effectSetups: (() => void | (() => void))[] = [];
    let authStateChange: (
      event: AuthChangeEvent,
      session: Session | null
    ) => void = () => undefined;
    const firstProfile = createDeferred<ProfileRow>();
    const secondProfile = createDeferred<ProfileRow>();

    jest.mocked(useState).mockImplementation(((initialValue: unknown) => {
      const setter = jest.fn();
      stateSetters.push(setter);
      return [initialValue, setter];
    }) as never);
    jest.mocked(useEffect).mockImplementation((setup) => {
      effectSetups.push(setup);
    });
    const mockOnAuthStateChange = jest.mocked(supabase!.auth.onAuthStateChange);
    const mockUnsubscribe = jest.fn();
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateChange = callback;
      return {
        data: {
          subscription: {
            callback,
            id: "test-subscription",
            unsubscribe: mockUnsubscribe,
          },
        },
      };
    });
    jest
      .mocked(ensureProfile)
      .mockImplementation(({ user }) =>
        user.id === "user-1" ? firstProfile.promise : secondProfile.promise
      );

    SessionProvider({ children: null });
    const cleanup = effectSetups[0]!();
    const firstSession = createSession("user-1");
    const secondSession = createSession("user-2");
    const profileForFirstSession = createProfile("user-1");
    const profileForSecondSession = createProfile("user-2");

    authStateChange("SIGNED_IN", firstSession);
    authStateChange("SIGNED_IN", secondSession);
    secondProfile.resolve(profileForSecondSession);
    await Promise.resolve();
    firstProfile.resolve(profileForFirstSession);
    await Promise.resolve();

    const setProfile = stateSetters[4]!;
    expect(setProfile).toHaveBeenCalledWith(profileForSecondSession);
    expect(setProfile).not.toHaveBeenCalledWith(profileForFirstSession);
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);

    cleanup?.();
  });
});
