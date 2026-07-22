import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "~/database.types";
import { supabase } from "~/supabase";

export type RepositoryClient = SupabaseClient<Database>;

export function getRepositoryClient(
  client?: RepositoryClient
): RepositoryClient {
  return client ?? supabase;
}
