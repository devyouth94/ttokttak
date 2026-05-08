import {
  AccountDeletionSessionRequiredError,
  deleteAccount,
} from "~/features/session/account-deletion";

describe("deleteAccount", () => {
  it("계정 삭제 성공 뒤 현재 기기의 세션과 Ttokttak 로컬 알림을 정리한다", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: { ok: true },
      error: null,
    });
    const signOut = jest.fn().mockResolvedValue({
      error: null,
    });
    const signOutFromGoogle = jest.fn(async () => undefined);
    const cancelAllTtokttakLocalReminderNotifications = jest.fn(
      async () => undefined
    );

    await deleteAccount({
      cancelAllTtokttakLocalReminderNotifications,
      client: {
        auth: {
          signOut,
        },
        functions: {
          invoke,
        },
      },
      currentUserId: "user-1",
      signOutFromGoogle,
    });

    expect(invoke).toHaveBeenCalledWith("delete-account", {
      body: { confirm: true },
    });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(signOutFromGoogle).toHaveBeenCalledTimes(1);
    expect(cancelAllTtokttakLocalReminderNotifications).toHaveBeenCalledTimes(
      1
    );
  });

  it("계정 삭제 호출이 실패하면 로컬 세션과 알림을 유지한다", async () => {
    const deleteError = new Error("delete failed");
    const invoke = jest.fn().mockResolvedValue({
      data: null,
      error: deleteError,
    });
    const signOut = jest.fn().mockResolvedValue({
      error: null,
    });
    const signOutFromGoogle = jest.fn(async () => undefined);
    const cancelAllTtokttakLocalReminderNotifications = jest.fn(
      async () => undefined
    );

    await expect(
      deleteAccount({
        cancelAllTtokttakLocalReminderNotifications,
        client: {
          auth: {
            signOut,
          },
          functions: {
            invoke,
          },
        },
        currentUserId: "user-1",
        signOutFromGoogle,
      })
    ).rejects.toThrow(deleteError);

    expect(signOut).not.toHaveBeenCalled();
    expect(signOutFromGoogle).not.toHaveBeenCalled();
    expect(cancelAllTtokttakLocalReminderNotifications).not.toHaveBeenCalled();
  });

  it("현재 사용자가 없으면 삭제 요청을 보내지 않고 다시 로그인하도록 요구한다", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: { ok: true },
      error: null,
    });
    const signOut = jest.fn().mockResolvedValue({
      error: null,
    });

    await expect(
      deleteAccount({
        cancelAllTtokttakLocalReminderNotifications: jest.fn(
          async () => undefined
        ),
        client: {
          auth: {
            signOut,
          },
          functions: {
            invoke,
          },
        },
        currentUserId: null,
        signOutFromGoogle: jest.fn(async () => undefined),
      })
    ).rejects.toBeInstanceOf(AccountDeletionSessionRequiredError);

    expect(invoke).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
});
