import type { User } from "@supabase/supabase-js";

import type { RepositoryClient } from "~/shared/api/repository-client";

import type { ProfileRow } from "./profile.types";

type EnsureProfileParams = {
  client: RepositoryClient;
  getDeviceTimeZone?: () => string;
  user: User;
};

type UpdateProfileDisplayNameParams = {
  client: RepositoryClient;
  displayName: string;
  userId: string;
};

function getDefaultDeviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getMetadataDisplayName(user: User): string | null {
  const fullName = user.user_metadata?.full_name;
  return typeof fullName === "string" && fullName.trim()
    ? fullName.trim()
    : null;
}

export async function ensureProfile({
  client,
  getDeviceTimeZone = getDefaultDeviceTimeZone,
  user,
}: EnsureProfileParams): Promise<ProfileRow> {
  const { data: existingProfile, error: fetchError } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existingProfile) {
    const metadataDisplayName = getMetadataDisplayName(user);
    const shouldSyncDisplayName =
      metadataDisplayName &&
      metadataDisplayName !== existingProfile.display_name &&
      !existingProfile.display_name;

    if (!shouldSyncDisplayName) {
      return existingProfile;
    }

    return updateProfileDisplayName({
      client,
      displayName: metadataDisplayName,
      userId: user.id,
    });
  }

  const { data: insertedProfile, error: insertError } = await client
    .from("profiles")
    .insert({
      display_name: getMetadataDisplayName(user),
      id: user.id,
      timezone: getDeviceTimeZone(),
    })
    .select("*")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: concurrentProfile, error: concurrentFetchError } =
        await client
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

      if (!concurrentFetchError && concurrentProfile) {
        return concurrentProfile;
      }

      if (concurrentFetchError) {
        throw concurrentFetchError;
      }
    }

    throw insertError;
  }

  return insertedProfile;
}

export async function updateProfileDisplayName({
  client,
  displayName,
  userId,
}: UpdateProfileDisplayNameParams): Promise<ProfileRow> {
  const { data, error } = await client
    .from("profiles")
    .update({
      display_name: displayName.trim(),
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
