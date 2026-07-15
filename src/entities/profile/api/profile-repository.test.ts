import { ensureProfile, updateProfileDisplayName } from "./profile-repository";

function createProfile(overrides: Record<string, unknown> = {}) {
  return {
    created_at: "2026-05-20T00:00:00.000Z",
    display_name: null,
    id: "user-1",
    timezone: "Asia/Seoul",
    updated_at: "2026-05-20T00:00:00.000Z",
    ...overrides,
  };
}

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-05-20T00:00:00.000Z",
    id: "user-1",
    user_metadata: {},
    ...overrides,
  };
}

function createAwaitableQuery<T>(result: T, methods: string[]) {
  const query = {} as Record<string, jest.Mock> & PromiseLike<T>;

  for (const method of methods) {
    query[method] = jest.fn(() => query);
  }

  query.then = ((onfulfilled) =>
    Promise.resolve(
      onfulfilled ? onfulfilled(result) : result
    )) as PromiseLike<T>["then"];

  return query;
}

describe("profile repository", () => {
  it("기존 profile이 있으면 그대로 반환한다", async () => {
    const existingProfile = createProfile({ display_name: "사용자" });
    const maybeSingleQuery = createAwaitableQuery(
      {
        data: existingProfile,
        error: null,
      },
      ["eq", "maybeSingle"]
    );
    const from = jest.fn(() => ({
      select: jest.fn(() => maybeSingleQuery),
    }));

    const profile = await ensureProfile({
      client: { from } as never,
      user: createUser() as never,
    });

    expect(profile).toBe(existingProfile);
  });

  it("profile이 없으면 현재 기기 timezone과 provider 이름으로 생성한다", async () => {
    const insertedProfile = createProfile({ display_name: "길동 홍" });
    const fetchQuery = createAwaitableQuery(
      {
        data: null,
        error: null,
      },
      ["eq", "maybeSingle"]
    );
    const insertSingle = jest.fn().mockResolvedValue({
      data: insertedProfile,
      error: null,
    });
    const insertSelect = jest.fn(() => ({ single: insertSingle }));
    const insert = jest.fn(() => ({ select: insertSelect }));
    const from = jest.fn(() => ({
      insert,
      select: jest.fn(() => fetchQuery),
    }));

    const profile = await ensureProfile({
      client: { from } as never,
      getDeviceTimeZone: () => "Asia/Seoul",
      user: createUser({
        user_metadata: {
          full_name: "길동 홍",
        },
      }) as never,
    });

    expect(insert).toHaveBeenCalledWith({
      display_name: "길동 홍",
      id: "user-1",
      timezone: "Asia/Seoul",
    });
    expect(profile).toBe(insertedProfile);
  });

  it("동시에 생성된 profile과 충돌하면 기존 행을 다시 읽는다", async () => {
    const concurrentProfile = createProfile();
    const initialFetchQuery = createAwaitableQuery(
      {
        data: null,
        error: null,
      },
      ["eq", "maybeSingle"]
    );
    const concurrentFetchQuery = createAwaitableQuery(
      {
        data: concurrentProfile,
        error: null,
      },
      ["eq", "maybeSingle"]
    );
    const select = jest
      .fn()
      .mockReturnValueOnce(initialFetchQuery)
      .mockReturnValueOnce(concurrentFetchQuery);
    const single = jest.fn().mockResolvedValue({
      data: null,
      error: { code: "23505" },
    });
    const insert = jest.fn(() => ({
      select: jest.fn(() => ({ single })),
    }));
    const from = jest.fn(() => ({ insert, select }));

    const profile = await ensureProfile({
      client: { from } as never,
      user: createUser() as never,
    });

    expect(profile).toBe(concurrentProfile);
    expect(select).toHaveBeenCalledTimes(2);
  });

  it("기존 profile 표시 이름이 비어 있을 때만 provider 이름을 동기화한다", async () => {
    const updatedProfile = createProfile({ display_name: "길동 홍" });
    const fetchQuery = createAwaitableQuery(
      {
        data: createProfile({ display_name: null }),
        error: null,
      },
      ["eq", "maybeSingle"]
    );
    const updateSingle = jest.fn().mockResolvedValue({
      data: updatedProfile,
      error: null,
    });
    const updateEqQuery = {
      select: jest.fn(() => ({ single: updateSingle })),
    };
    const update = jest.fn(() => ({
      eq: jest.fn(() => updateEqQuery),
    }));
    const from = jest.fn(() => ({
      select: jest.fn(() => fetchQuery),
      update,
    }));

    const profile = await ensureProfile({
      client: { from } as never,
      user: createUser({
        user_metadata: {
          full_name: "길동 홍",
        },
      }) as never,
    });

    expect(update).toHaveBeenCalledWith({
      display_name: "길동 홍",
    });
    expect(profile).toBe(updatedProfile);
  });

  it("profile 표시 이름 수정은 trim된 값을 저장한다", async () => {
    const updatedProfile = createProfile({ display_name: "길동 홍" });
    const single = jest.fn().mockResolvedValue({
      data: updatedProfile,
      error: null,
    });
    const eqQuery = {
      select: jest.fn(() => ({ single })),
    };
    const eq = jest.fn(() => eqQuery);
    const update = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ update }));

    const profile = await updateProfileDisplayName({
      client: { from } as never,
      displayName: "  길동 홍  ",
      userId: "user-1",
    });

    expect(update).toHaveBeenCalledWith({
      display_name: "길동 홍",
    });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
    expect(profile).toBe(updatedProfile);
  });
});
