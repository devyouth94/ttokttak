import type { ReactElement } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import {
  prepareProfile,
  type Profile,
  updateName as saveName,
} from "~/account/profile";
import { captureException } from "~/sentry";
import { supabase } from "~/supabase";

import { SessionProvider, useSession } from "./provider";

declare const require: (moduleName: string) => unknown;

jest.mock("~/account/delete", () => ({
  deleteAccount: jest.fn(),
}));
jest.mock("~/account/profile", () => ({
  prepareProfile: jest.fn(),
  updateName: jest.fn(),
}));
jest.mock("~/session/apple", () => ({
  signInApple: jest.fn(),
}));
jest.mock("~/session/google", () => ({
  signInGoogle: jest.fn(),
  signOutGoogle: jest.fn(),
}));
jest.mock("~/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));
jest.mock("~/sentry", () => ({
  captureException: jest.fn(),
}));

const TestRenderer = require("react-test-renderer") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  create: (element: ReactElement) => { unmount: () => void };
};
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

function createProfile(userId: string): Profile {
  return {
    created_at: "2026-07-13T00:00:00.000Z",
    display_name: null,
    id: userId,
    timezone: "Asia/Seoul",
    updated_at: "2026-07-13T00:00:00.000Z",
  };
}

function requireSession(
  session: ReturnType<typeof useSession> | null
): ReturnType<typeof useSession> {
  if (!session) {
    throw new Error("세션 컨텍스트를 읽지 못했습니다.");
  }

  return session;
}

describe("SessionProvider", () => {
  let emitAuthChange!: (
    event: AuthChangeEvent,
    session: Session | null
  ) => void;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(supabase.auth.onAuthStateChange).mockImplementation(((
      callback: typeof emitAuthChange
    ) => {
      emitAuthChange = callback;

      return {
        data: {
          subscription: { unsubscribe: jest.fn() },
        },
      };
    }) as never);
  });

  async function renderSession() {
    let session: ReturnType<typeof useSession> | null = null;

    function SessionProbe(): null {
      session = useSession();
      return null;
    }

    await TestRenderer.act(async () => {
      TestRenderer.create(
        <SessionProvider>
          <SessionProbe />
        </SessionProvider>
      );
      await Promise.resolve();
    });

    return () => requireSession(session);
  }

  it("늦게 완료된 이전 사용자의 프로필을 무시한다", async () => {
    const first = createDeferred<Profile>();
    const second = createDeferred<Profile>();
    const secondProfile = createProfile("user-2");

    jest
      .mocked(prepareProfile)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const getSession = await renderSession();

    await TestRenderer.act(async () => {
      emitAuthChange("SIGNED_IN", createSession("user-1"));
      emitAuthChange("SIGNED_IN", createSession("user-2"));
      second.resolve(secondProfile);
      await second.promise;
    });

    expect(getSession()).toMatchObject({
      profile: secondProfile,
      status: "ready",
    });

    await TestRenderer.act(async () => {
      first.resolve(createProfile("user-1"));
      await first.promise;
    });

    expect(getSession().profile).toBe(secondProfile);
  });

  it("계정 전환 뒤 완료된 이전 사용자의 이름 저장을 무시한다", async () => {
    const saved = createDeferred<Profile>();
    const firstProfile = createProfile("user-1");
    const secondProfile = createProfile("user-2");

    jest
      .mocked(prepareProfile)
      .mockResolvedValueOnce(firstProfile)
      .mockResolvedValueOnce(secondProfile);
    jest.mocked(saveName).mockReturnValueOnce(saved.promise);
    const getSession = await renderSession();

    await TestRenderer.act(async () => {
      emitAuthChange("SIGNED_IN", createSession("user-1"));
      await Promise.resolve();
      await Promise.resolve();
    });

    let updatePromise!: Promise<void>;
    await TestRenderer.act(() => {
      updatePromise = getSession().updateName("이전 사용자 이름");
    });

    await TestRenderer.act(async () => {
      emitAuthChange("SIGNED_IN", createSession("user-2"));
      await Promise.resolve();
      await Promise.resolve();
    });

    await TestRenderer.act(async () => {
      saved.resolve({ ...firstProfile, display_name: "이전 사용자 이름" });
      await updatePromise;
    });

    expect(getSession().profile).toBe(secondProfile);
  });

  it("프로필 준비 실패 후 다시 시도하면 ready 상태가 된다", async () => {
    const error = new Error("프로필 조회 실패");
    const profile = createProfile("user-1");

    jest
      .mocked(prepareProfile)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(profile);
    const getSession = await renderSession();

    await TestRenderer.act(async () => {
      emitAuthChange("SIGNED_IN", createSession("user-1"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getSession().status).toBe("error");
    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { feature: "session-profile" },
    });

    await TestRenderer.act(async () => {
      await getSession().retry();
    });

    expect(getSession()).toMatchObject({ profile, status: "ready" });
  });
});
