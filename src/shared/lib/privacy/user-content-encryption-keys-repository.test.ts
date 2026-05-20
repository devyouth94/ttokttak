import {
  getUserContentEncryptionKey,
  upsertUserContentEncryptionKey,
} from "~/shared/lib/privacy/user-content-encryption-keys-repository";

const row = {
  user_id: "user-1",
  key_version: 1,
  wrapped_key: "wrapped-key-ciphertext",
  wrap_algorithm: "test-wrap",
  wrap_metadata: {
    provider: "test",
  },
  created_at: "2026-05-06T00:00:00.000Z",
  updated_at: "2026-05-06T00:00:00.000Z",
};

describe("user content encryption keys repository", () => {
  it("사용자별 wrapped key를 평문 키 없이 upsert 한다", async () => {
    const single = jest.fn().mockResolvedValue({
      data: row,
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ upsert }));

    const key = await upsertUserContentEncryptionKey(
      {
        keyVersion: 1,
        userId: "user-1",
        wrapAlgorithm: "test-wrap",
        wrapMetadata: {
          provider: "test",
        },
        wrappedKey: "wrapped-key-ciphertext",
      },
      { from } as never
    );

    expect(from).toHaveBeenCalledWith("user_content_encryption_keys");
    expect(upsert).toHaveBeenCalledWith(
      {
        key_version: 1,
        user_id: "user-1",
        wrap_algorithm: "test-wrap",
        wrap_metadata: {
          provider: "test",
        },
        wrapped_key: "wrapped-key-ciphertext",
      },
      { onConflict: "user_id,key_version" }
    );
    expect(JSON.stringify(upsert.mock.calls)).not.toContain("plain");
    expect(key.wrappedKey).toBe("wrapped-key-ciphertext");
  });

  it("사용자별 key version으로 wrapped key를 조회한다", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: row,
      error: null,
    });
    const query = {
      eq: jest.fn(),
      maybeSingle,
      select: jest.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const from = jest.fn(() => query);

    const key = await getUserContentEncryptionKey({
      client: { from } as never,
      keyVersion: 1,
      userId: "user-1",
    });

    expect(query.eq).toHaveBeenNthCalledWith(1, "user_id", "user-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "key_version", 1);
    expect(key?.wrapAlgorithm).toBe("test-wrap");
  });
});
