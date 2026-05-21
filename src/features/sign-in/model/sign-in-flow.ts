import { updateProfileDisplayName } from "~/entities/profile";
import type { RepositoryClient } from "~/shared/api/repository-client";

import {
  type AppleSignInResult,
  signInWithAppleIdToken,
} from "./apple-sign-in";
import { signInWithGoogleIdToken } from "./google-sign-in";

type SignInWithAppleParams = {
  client: RepositoryClient;
  requestAppleSignIn?: () => Promise<AppleSignInResult>;
  updateSignedInProfileDisplayName?: typeof updateProfileDisplayName;
};

type SignInWithGoogleParams = {
  client: RepositoryClient;
  requestGoogleIdToken?: () => Promise<string>;
};

export async function signInWithApple({
  client,
  requestAppleSignIn = signInWithAppleIdToken,
  updateSignedInProfileDisplayName = updateProfileDisplayName,
}: SignInWithAppleParams): Promise<void> {
  const { displayName, familyName, givenName, identityToken } =
    await requestAppleSignIn();
  const { data, error } = await client.auth.signInWithIdToken({
    provider: "apple",
    token: identityToken,
  });

  if (error) {
    throw error;
  }

  if (displayName || givenName || familyName) {
    const metadata: Record<string, string> = {};

    if (displayName) {
      metadata.full_name = displayName;
    }

    if (givenName) {
      metadata.given_name = givenName;
    }

    if (familyName) {
      metadata.family_name = familyName;
    }

    const { error: metadataError } = await client.auth.updateUser({
      data: metadata,
    });

    if (metadataError) {
      throw metadataError;
    }
  }

  if (displayName && data.user) {
    await updateSignedInProfileDisplayName({
      client,
      displayName,
      userId: data.user.id,
    });
  }
}

export async function signInWithGoogle({
  client,
  requestGoogleIdToken = signInWithGoogleIdToken,
}: SignInWithGoogleParams): Promise<void> {
  const token = await requestGoogleIdToken();
  const { error } = await client.auth.signInWithIdToken({
    provider: "google",
    token,
  });

  if (error) {
    throw error;
  }
}
