import { signInWithApple, signInWithGoogle } from "./sign-in-flow";

describe("sign-in flow", () => {
  it("Google ID 토큰으로 Supabase Google 로그인을 수행한다", async () => {
    const signInWithIdToken = jest.fn().mockResolvedValue({ error: null });

    await signInWithGoogle({
      client: {
        auth: {
          signInWithIdToken,
        },
      } as never,
      requestGoogleIdToken: jest.fn(async () => "google-id-token"),
    });

    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "google-id-token",
    });
  });

  it("Apple ID 토큰과 이름 metadata로 Supabase Apple 로그인을 수행한다", async () => {
    const signInWithIdToken = jest.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    const updateUser = jest.fn().mockResolvedValue({ error: null });
    const updateSignedInProfileDisplayName = jest.fn(async () => ({
      created_at: "2026-05-20T00:00:00.000Z",
      display_name: "길동 홍",
      id: "user-1",
      timezone: "Asia/Seoul",
      updated_at: "2026-05-20T00:00:00.000Z",
    }));

    await signInWithApple({
      client: {
        auth: {
          signInWithIdToken,
          updateUser,
        },
      } as never,
      requestAppleSignIn: jest.fn(async () => ({
        displayName: "길동 홍",
        familyName: "홍",
        givenName: "길동",
        identityToken: "apple-id-token",
      })),
      updateSignedInProfileDisplayName,
    });

    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: "apple",
      token: "apple-id-token",
    });
    expect(updateUser).toHaveBeenCalledWith({
      data: {
        family_name: "홍",
        full_name: "길동 홍",
        given_name: "길동",
      },
    });
    expect(updateSignedInProfileDisplayName).toHaveBeenCalledWith({
      client: expect.anything(),
      displayName: "길동 홍",
      userId: "user-1",
    });
  });

  it("Apple 이름이 없으면 profile 표시 이름을 덮어쓰지 않는다", async () => {
    const signInWithIdToken = jest.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    const updateUser = jest.fn().mockResolvedValue({ error: null });
    const updateSignedInProfileDisplayName = jest.fn();

    await signInWithApple({
      client: {
        auth: {
          signInWithIdToken,
          updateUser,
        },
      } as never,
      requestAppleSignIn: jest.fn(async () => ({
        displayName: null,
        familyName: null,
        givenName: null,
        identityToken: "apple-id-token",
      })),
      updateSignedInProfileDisplayName,
    });

    expect(updateUser).not.toHaveBeenCalled();
    expect(updateSignedInProfileDisplayName).not.toHaveBeenCalled();
  });
});
