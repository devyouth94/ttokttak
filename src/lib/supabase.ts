import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "~/lib/database.types";

import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const secureStorage = {
  getItem(key: string) {
    return getItemAsync(key);
  },
  setItem(key: string, value: string) {
    return setItemAsync(key, value);
  },
  removeItem(key: string) {
    return deleteItemAsync(key);
  },
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseKey!, {
      auth: {
        storage: secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
