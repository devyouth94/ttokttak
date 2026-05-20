import {
  assertAesGcmContentEncryptionMetadata,
  base64ToBytes,
} from "~/shared/lib/privacy/aes-gcm-content-cipher";

describe("aes gcm content cipher", () => {
  it("combined base64 값을 byte 배열로 바꾼다", () => {
    expect(Array.from(base64ToBytes("dGVzdA=="))).toEqual([116, 101, 115, 116]);
  });

  it("지원하는 AES-GCM metadata만 허용한다", () => {
    expect(
      assertAesGcmContentEncryptionMetadata({
        algorithm: "AES-GCM",
        encoding: "combined-base64",
        keyStorage: "server-wrapped",
      })
    ).toEqual({
      algorithm: "AES-GCM",
      encoding: "combined-base64",
      keyStorage: "server-wrapped",
    });

    expect(() =>
      assertAesGcmContentEncryptionMetadata({
        algorithm: "AES-GCM",
        encoding: "plain",
        keyStorage: "server-wrapped",
      })
    ).toThrow("암호화 메타데이터를 읽을 수 없습니다.");
  });
});
