import type { User } from "@supabase/supabase-js";

import { prepareProfile, type Profile, updateName } from "./profile";

const mockFetch = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
jest.mock("~/supabase", () => {
  const { createClient } = jest.requireActual<
    typeof import("@supabase/supabase-js")
  >("@supabase/supabase-js");
  return {
    supabase: createClient("https://example.supabase.co", "test-key", {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (input, init) => mockFetch(String(input), init),
      },
    }),
  };
});

const user: User = {
  id: "user-1",
  app_metadata: {},
  user_metadata: { full_name: " 제공자 이름 " },
  aud: "authenticated",
  created_at: "2026-05-20T00:00:00Z",
};
const profile: Profile = {
  id: user.id,
  display_name: "내가 정한 이름",
  timezone: "Asia/Seoul",
  created_at: user.created_at,
  updated_at: user.created_at,
};

beforeEach(() => mockFetch.mockReset());
afterEach(() => {
  // SDK가 만드는 실제 HTTP 요청에서 대상 사용자와 테이블을 검증한다.
  for (const [input, init] of mockFetch.mock.calls) {
    const url = new URL(String(input));
    expect(url.pathname).toBe("/rest/v1/profiles");
    if (init?.method === "POST")
      expect(JSON.parse(String(init.body)).id).toBe(user.id);
    else expect(url.searchParams.get("id")).toBe(`eq.${user.id}`);
  }
});

it("기존 이름이 있으면 로그인 제공자의 이름으로 덮어쓰지 않는다", async () => {
  mockFetch.mockResolvedValueOnce(response([profile]));
  await expect(prepareProfile(user)).resolves.toEqual(profile);
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it("프로필이 없으면 제공자 이름과 기기 시간대로 생성한다", async () => {
  mockFetch
    .mockResolvedValueOnce(response([]))
    .mockResolvedValueOnce(
      response({ ...profile, display_name: "제공자 이름" })
    );
  await expect(prepareProfile(user)).resolves.toMatchObject({
    display_name: "제공자 이름",
  });
  expect(JSON.parse(String(mockFetch.mock.calls[1]?.[1]?.body))).toEqual({
    id: user.id,
    display_name: "제공자 이름",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
});

it("다른 요청이 먼저 생성하면 이미 저장된 프로필을 다시 읽는다", async () => {
  mockFetch
    .mockResolvedValueOnce(response([]))
    .mockResolvedValueOnce(
      response({ code: "23505", message: "이미 존재함" }, 409)
    )
    .mockResolvedValueOnce(response([profile]));
  await expect(prepareProfile(user)).resolves.toEqual(profile);
});

it("이름이 없는 기존 프로필만 제공자 이름으로 채운다", async () => {
  mockFetch
    .mockResolvedValueOnce(response([{ ...profile, display_name: null }]))
    .mockResolvedValueOnce(
      response({ ...profile, display_name: "제공자 이름" })
    );
  await expect(prepareProfile(user)).resolves.toMatchObject({
    display_name: "제공자 이름",
  });
  expect(mockFetch.mock.calls[1]?.[1]?.method).toBe("PATCH");
  expect(JSON.parse(String(mockFetch.mock.calls[1]?.[1]?.body))).toEqual({
    display_name: "제공자 이름",
  });
});

it("표시 이름 변경은 앞뒤 공백을 제거해 저장한다", async () => {
  mockFetch.mockResolvedValueOnce(
    response({ ...profile, display_name: "새 이름" })
  );
  await expect(updateName(user.id, " 새 이름 ")).resolves.toMatchObject({
    display_name: "새 이름",
  });
  expect(JSON.parse(String(mockFetch.mock.calls[0]?.[1]?.body))).toEqual({
    display_name: "새 이름",
  });
});

it("조회·생성·저장 실패를 성공한 프로필로 바꾸지 않는다", async () => {
  const error = { code: "42501", message: "접근 거부" };
  mockFetch.mockResolvedValueOnce(response(error, 403));
  await expect(prepareProfile(user)).rejects.toMatchObject(error);
  expect(mockFetch).toHaveBeenCalledTimes(1);

  mockFetch
    .mockResolvedValueOnce(response([]))
    .mockResolvedValueOnce(response(error, 403));
  await expect(prepareProfile(user)).rejects.toMatchObject(error);

  mockFetch.mockResolvedValueOnce(response(error, 403));
  await expect(updateName(user.id, "새 이름")).rejects.toMatchObject(error);
});

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
