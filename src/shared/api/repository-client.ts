import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "~/shared/api/database.types";
import { getSupabaseClient } from "~/shared/api/supabase";

export type RepositoryClient = SupabaseClient<Database>;

export function getRepositoryClient(
  client?: RepositoryClient
): RepositoryClient {
  return client ?? getSupabaseClient();
}
