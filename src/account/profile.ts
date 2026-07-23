import type { User } from "@supabase/supabase-js";

import type { Database } from "~/database.types";
import { supabase } from "~/supabase";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

function getName(user: User): string | null {
  const name = user.user_metadata?.full_name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

/** 사용자의 프로필 표시 이름을 저장한다. */
export async function updateName(
  userId: string,
  name: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: name.trim() })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/** 로그인 사용자의 프로필을 조회하고 없으면 생성한다. */
export async function prepareProfile(user: User): Promise<Profile> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (profile) {
    const name = getName(user);

    if (name && !profile.display_name) {
      return updateName(user.id, name);
    }

    return profile;
  }

  const { data, error: insertError } = await supabase
    .from("profiles")
    .insert({
      display_name: getName(user),
      id: user.id,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    .select("*")
    .single();

  if (!insertError) {
    return data;
  }

  // 다른 요청이 먼저 생성했다면 그 행을 현재 프로필로 사용한다.
  if (insertError.code === "23505") {
    const { data: concurrentProfile, error: concurrentError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!concurrentError && concurrentProfile) {
      return concurrentProfile;
    }

    if (concurrentError) {
      throw concurrentError;
    }
  }

  throw insertError;
}
