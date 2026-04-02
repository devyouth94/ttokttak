import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "~/lib/database.types";
import { getSupabaseClient } from "~/lib/supabase";

export type RepositoryClient = SupabaseClient<Database>;

export function getRepositoryClient(
  client?: RepositoryClient
): RepositoryClient {
  return client ?? getSupabaseClient();
}
