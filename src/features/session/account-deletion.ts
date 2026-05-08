type DeleteAccountClient = {
  auth: {
    signOut: (options: { scope: "local" }) => Promise<{ error: Error | null }>;
  };
  functions: {
    invoke: (
      functionName: "delete-account",
      options: { body: { confirm: true } }
    ) => Promise<{ error: Error | null }>;
  };
};

type DeleteAccountParams = {
  cancelAllTtokttakLocalReminderNotifications: () => Promise<unknown>;
  client: DeleteAccountClient;
  currentUserId: string | null | undefined;
  signOutFromGoogle: () => Promise<void>;
};

export class AccountDeletionSessionRequiredError extends Error {
  constructor() {
    super("계정 삭제를 진행하려면 다시 로그인이 필요합니다.");
    this.name = "AccountDeletionSessionRequiredError";
  }
}

export async function deleteAccount({
  cancelAllTtokttakLocalReminderNotifications,
  client,
  currentUserId,
  signOutFromGoogle,
}: DeleteAccountParams): Promise<void> {
  if (!currentUserId) {
    throw new AccountDeletionSessionRequiredError();
  }

  const { error: deleteError } = await client.functions.invoke(
    "delete-account",
    {
      body: { confirm: true },
    }
  );

  if (deleteError) {
    throw deleteError;
  }

  const { error: signOutError } = await client.auth.signOut({
    scope: "local",
  });

  if (signOutError) {
    throw signOutError;
  }

  await signOutFromGoogle();
  await cancelAllTtokttakLocalReminderNotifications();
}
